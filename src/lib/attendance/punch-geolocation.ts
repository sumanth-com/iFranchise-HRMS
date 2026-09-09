export type PunchGeolocationStatus =
  | "captured"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "poor_accuracy";

export type PunchGeolocationResult = {
  latitude?: number;
  longitude?: number;
  /** Horizontal accuracy radius in meters from the Geolocation API. */
  accuracy?: number;
  status: PunchGeolocationStatus;
  /** Samples considered while refining accuracy (debug). */
  sampleCount?: number;
};

/** Stop immediately once GPS is this accurate (meters). */
const TARGET_ACCURACY_M = 50;
/**
 * Reject fixes worse than this — cell/Wi‑Fi approximations are often
 * hundreds–thousands of meters off.
 */
const MAX_ACCEPTABLE_ACCURACY_M = 120;
/** Brief refine window after the first usable fix, then take the best. */
const REFINE_WINDOW_MS = 2_000;
/** Hard cap when permission is already granted (keep punch feeling fast). */
const MAX_WAIT_GRANTED_MS = 7_000;
/** Allow time for the browser permission prompt only. */
const MAX_WAIT_PROMPT_MS = 90_000;
/** Short high-accuracy retry only when the first pass got no usable fix. */
const RETRY_TIMEOUT_MS = 3_500;

/**
 * Fresh high-accuracy browser GPS for Check In / Check Out / Update Check Out.
 * Must be called from a user gesture.
 *
 * - enableHighAccuracy: true always
 * - maximumAge: 0 (never reuse cached/stale fixes)
 * - never falls back to low-accuracy / network-only location
 * - samples briefly and keeps the best (lowest) accuracy reading
 * - does not return coordinates when accuracy stays poor
 */
export async function getOptionalPunchGeolocation(): Promise<PunchGeolocationResult> {
  if (typeof window === "undefined" || !navigator?.geolocation) {
    return { status: "unsupported" };
  }

  let permissionState: PermissionState | "unknown" = "unknown";
  try {
    if (navigator.permissions?.query) {
      const status = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      permissionState = status.state;
    }
  } catch {
    permissionState = "unknown";
  }

  if (permissionState === "denied") {
    return { status: "denied" };
  }

  const maxWaitMs =
    permissionState === "granted" ? MAX_WAIT_GRANTED_MS : MAX_WAIT_PROMPT_MS;

  const sampled = await sampleHighAccuracyPosition(maxWaitMs);

  if (sampled.status === "captured" && sampled.latitude != null && sampled.longitude != null) {
    console.info("[punch-geolocation] captured", {
      latitude: sampled.latitude,
      longitude: sampled.longitude,
      accuracyM: sampled.accuracy,
      sampleCount: sampled.sampleCount,
    });
    return sampled;
  }

  // One short high-accuracy retry only when we still have nothing usable.
  if (
    sampled.status === "timeout" ||
    sampled.status === "poor_accuracy" ||
    sampled.status === "unavailable"
  ) {
    const retry = await requestSingleHighAccuracyPosition(RETRY_TIMEOUT_MS);
    if (
      retry.status === "captured" &&
      retry.latitude != null &&
      retry.longitude != null &&
      isAcceptableAccuracy(retry.accuracy)
    ) {
      console.info("[punch-geolocation] captured after retry", {
        latitude: retry.latitude,
        longitude: retry.longitude,
        accuracyM: retry.accuracy,
      });
      return {
        ...retry,
        sampleCount: (sampled.sampleCount ?? 0) + 1,
      };
    }

    if (retry.status === "denied") return { status: "denied" };

    const bestAccuracy = pickBetterAccuracy(sampled.accuracy, retry.accuracy);
    if (bestAccuracy != null && !isAcceptableAccuracy(bestAccuracy)) {
      console.warn("[punch-geolocation] rejecting poor accuracy", {
        accuracyM: bestAccuracy,
        maxAcceptableM: MAX_ACCEPTABLE_ACCURACY_M,
        sampleCount: (sampled.sampleCount ?? 0) + (retry.sampleCount ?? 0),
      });
      return {
        status: "poor_accuracy",
        accuracy: bestAccuracy,
        sampleCount: (sampled.sampleCount ?? 0) + (retry.sampleCount ?? 0),
      };
    }

    if (sampled.status === "poor_accuracy") {
      console.warn("[punch-geolocation] rejecting poor accuracy", {
        accuracyM: sampled.accuracy,
        maxAcceptableM: MAX_ACCEPTABLE_ACCURACY_M,
        sampleCount: sampled.sampleCount,
      });
      return sampled;
    }

    return retry.status !== "captured" ? retry : sampled;
  }

  return sampled;
}

function isAcceptableAccuracy(accuracy: number | undefined): boolean {
  if (accuracy == null || !Number.isFinite(accuracy)) return true;
  return accuracy >= 0 && accuracy <= MAX_ACCEPTABLE_ACCURACY_M;
}

function isTargetAccuracy(accuracy: number | undefined): boolean {
  return (
    typeof accuracy === "number" &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= TARGET_ACCURACY_M
  );
}

function pickBetterAccuracy(
  a: number | undefined,
  b: number | undefined,
): number | undefined {
  if (a == null) return b;
  if (b == null) return a;
  return a <= b ? a : b;
}

function normalizeCoords(position: GeolocationPosition): PunchGeolocationResult | null {
  const { latitude, longitude, accuracy } = position.coords;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }

  return {
    status: "captured",
    // Keep full floating-point precision — never round/truncate before save.
    latitude,
    longitude,
    accuracy:
      typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0
        ? accuracy
        : undefined,
  };
}

function sampleHighAccuracyPosition(
  maxWaitMs: number,
): Promise<PunchGeolocationResult> {
  return new Promise((resolve) => {
    let settled = false;
    let best: PunchGeolocationResult | null = null;
    let sampleCount = 0;
    let firstFixAt: number | null = null;
    let watchId: number | null = null;
    let refineTimer: number | null = null;

    const finish = (value: PunchGeolocationResult) => {
      if (settled) return;
      settled = true;
      if (watchId != null) {
        try {
          navigator.geolocation.clearWatch(watchId);
        } catch {
          // ignore
        }
      }
      if (refineTimer != null) window.clearTimeout(refineTimer);
      window.clearTimeout(hardTimer);
      resolve({ ...value, sampleCount });
    };

    const consider = (position: GeolocationPosition) => {
      const next = normalizeCoords(position);
      if (!next) return;
      sampleCount += 1;
      if (
        !best ||
        (next.accuracy != null &&
          (best.accuracy == null || next.accuracy < best.accuracy))
      ) {
        best = next;
      }

      if (isTargetAccuracy(best.accuracy)) {
        finish(best);
        return;
      }

      if (firstFixAt == null) {
        firstFixAt = Date.now();
        refineTimer = window.setTimeout(() => {
          if (!best) return;
          if (isAcceptableAccuracy(best.accuracy)) {
            finish(best);
          }
        }, REFINE_WINDOW_MS);
      } else if (
        Date.now() - firstFixAt >= REFINE_WINDOW_MS &&
        isAcceptableAccuracy(best.accuracy)
      ) {
        finish(best);
      }
    };

    const hardTimer = window.setTimeout(() => {
      if (best && isAcceptableAccuracy(best.accuracy)) {
        finish(best);
        return;
      }
      if (best && best.accuracy != null && !isAcceptableAccuracy(best.accuracy)) {
        finish({
          status: "poor_accuracy",
          accuracy: best.accuracy,
        });
        return;
      }
      finish(best ? { status: "unavailable" } : { status: "timeout" });
    }, maxWaitMs);

    try {
      // Warm the GPS radio immediately while watchPosition continues refining.
      navigator.geolocation.getCurrentPosition(
        consider,
        () => {
          // Watch may still succeed; ignore this probe's failure.
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: Math.min(5_000, maxWaitMs),
        },
      );

      watchId = navigator.geolocation.watchPosition(
        consider,
        (error) => {
          if (error?.code === error.PERMISSION_DENIED) {
            finish({ status: "denied" });
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: maxWaitMs,
        },
      );
    } catch {
      finish({ status: "unavailable" });
    }
  });
}

function requestSingleHighAccuracyPosition(
  timeoutMs: number,
): Promise<PunchGeolocationResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: PunchGeolocationResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      resolve(value);
    };

    const safetyTimer = window.setTimeout(
      () => finish({ status: "timeout" }),
      timeoutMs + 1_500,
    );

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = normalizeCoords(position);
          if (!next) {
            finish({ status: "unavailable" });
            return;
          }
          if (!isAcceptableAccuracy(next.accuracy)) {
            finish({
              status: "poor_accuracy",
              accuracy: next.accuracy,
              sampleCount: 1,
            });
            return;
          }
          finish({ ...next, sampleCount: 1 });
        },
        (error) => {
          if (error?.code === error.PERMISSION_DENIED) {
            finish({ status: "denied" });
            return;
          }
          if (error?.code === error.TIMEOUT) {
            finish({ status: "timeout" });
            return;
          }
          finish({ status: "unavailable" });
        },
        {
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: 0,
        },
      );
    } catch {
      finish({ status: "unavailable" });
    }
  });
}
