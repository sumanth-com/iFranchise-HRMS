export type PunchGeolocationStatus =
  | "captured"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

export type PunchGeolocationResult = {
  latitude?: number;
  longitude?: number;
  /** Horizontal accuracy radius in meters from the Geolocation API. */
  accuracy?: number;
  status: PunchGeolocationStatus;
  sampleCount?: number;
};

/** Stop early once GPS is this accurate (meters). */
const EXCELLENT_ACCURACY_M = 50;
/** Prefer finishing once we have a solid indoor/outdoor fix. */
const GOOD_ACCURACY_M = 100;
/**
 * Still save real-world indoor / laptop / weak-GPS fixes up to this radius.
 * Far larger values (e.g. 200000 m) are treated as broken and discarded.
 */
const MAX_USABLE_ACCURACY_M = 10_000;
/** Hard reject — browser junk / IP-level nonsense. */
const ABSURD_ACCURACY_M = 50_000;
/** Brief refine after first usable sample. */
const REFINE_WINDOW_MS = 2_500;
/** Keep punch snappy when permission is already granted. */
const MAX_WAIT_GRANTED_MS = 12_000;
/** Allow time for the browser permission prompt. */
const MAX_WAIT_PROMPT_MS = 90_000;
/** Short retry when the first pass produced nothing usable. */
const RETRY_TIMEOUT_MS = 4_000;

/**
 * Fresh browser geolocation for Check In / Check Out / Update Check Out.
 * Must be called from a user gesture.
 *
 * Strategy: sample high-accuracy fixes, keep the best (lowest) accuracy,
 * accept normal real-world indoor accuracy, and only discard broken data.
 * Callers must still allow the punch when location is unavailable.
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

  const sampled = await samplePositions({
    maxWaitMs,
    enableHighAccuracy: true,
  });

  if (isCapturedFix(sampled)) {
    logCapture("captured", sampled);
    return sampled;
  }

  // Brief high-accuracy retry.
  const retry = await requestSinglePosition({
    timeoutMs: RETRY_TIMEOUT_MS,
    enableHighAccuracy: true,
  });
  if (retry.status === "denied") return { status: "denied" };
  if (isCapturedFix(retry)) {
    logCapture("captured after retry", retry);
    return {
      ...retry,
      sampleCount: (sampled.sampleCount ?? 0) + (retry.sampleCount ?? 0),
    };
  }

  // Desktop / indoor fallback: still fresh (maximumAge 0), best valid browser fix.
  const soft = await requestSinglePosition({
    timeoutMs: RETRY_TIMEOUT_MS,
    enableHighAccuracy: false,
  });
  if (soft.status === "denied") return { status: "denied" };
  if (isCapturedFix(soft)) {
    logCapture("captured soft fallback", soft);
    return {
      ...soft,
      sampleCount:
        (sampled.sampleCount ?? 0) +
        (retry.sampleCount ?? 0) +
        (soft.sampleCount ?? 0),
    };
  }

  // Prefer any non-absurd sample we already saw over returning empty.
  const bestCandidate = pickBestCandidate(sampled, retry, soft);
  if (bestCandidate && isCapturedFix(bestCandidate)) {
    logCapture("captured best candidate", bestCandidate);
    return bestCandidate;
  }

  if (bestCandidate?.accuracy != null && bestCandidate.accuracy > ABSURD_ACCURACY_M) {
    console.warn("[punch-geolocation] discarded absurd accuracy", {
      accuracyM: bestCandidate.accuracy,
    });
  }

  return {
    status:
      sampled.status === "timeout" ||
      retry.status === "timeout" ||
      soft.status === "timeout"
        ? "timeout"
        : "unavailable",
    sampleCount:
      (sampled.sampleCount ?? 0) +
      (retry.sampleCount ?? 0) +
      (soft.sampleCount ?? 0),
  };
}

function logCapture(label: string, geo: PunchGeolocationResult) {
  console.info(`[punch-geolocation] ${label}`, {
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracyM: geo.accuracy,
    sampleCount: geo.sampleCount,
  });
}

function isCapturedFix(geo: PunchGeolocationResult | null | undefined): boolean {
  if (!geo || geo.status !== "captured") return false;
  if (geo.latitude == null || geo.longitude == null) return false;
  if (!isValidLatLng(geo.latitude, geo.longitude)) return false;
  if (geo.accuracy != null && !Number.isFinite(geo.accuracy)) return false;
  if (geo.accuracy != null && geo.accuracy > MAX_USABLE_ACCURACY_M) return false;
  return true;
}

function isValidLatLng(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

function isExcellent(accuracy: number | undefined): boolean {
  return (
    typeof accuracy === "number" &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= EXCELLENT_ACCURACY_M
  );
}

function isGood(accuracy: number | undefined): boolean {
  return (
    typeof accuracy === "number" &&
    Number.isFinite(accuracy) &&
    accuracy >= 0 &&
    accuracy <= GOOD_ACCURACY_M
  );
}

function isUsableAccuracy(accuracy: number | undefined): boolean {
  // Missing accuracy: still allow if coords validated (some browsers omit it).
  if (accuracy == null || !Number.isFinite(accuracy)) return true;
  return accuracy >= 0 && accuracy <= MAX_USABLE_ACCURACY_M;
}

function pickBetter(
  a: PunchGeolocationResult | null,
  b: PunchGeolocationResult | null,
): PunchGeolocationResult | null {
  if (!a) return b;
  if (!b) return a;
  const aAcc = a.accuracy;
  const bAcc = b.accuracy;
  if (aAcc == null) return bAcc == null ? a : b;
  if (bAcc == null) return a;
  return aAcc <= bAcc ? a : b;
}

function pickBestCandidate(
  ...candidates: PunchGeolocationResult[]
): PunchGeolocationResult | null {
  let best: PunchGeolocationResult | null = null;
  for (const candidate of candidates) {
    if (
      candidate.latitude == null ||
      candidate.longitude == null ||
      !isValidLatLng(candidate.latitude, candidate.longitude)
    ) {
      continue;
    }
    if (candidate.accuracy != null && candidate.accuracy > ABSURD_ACCURACY_M) {
      continue;
    }
    const asCaptured: PunchGeolocationResult = {
      ...candidate,
      status: "captured",
    };
    best = pickBetter(best, asCaptured);
  }
  return best;
}

function normalizeCoords(
  position: GeolocationPosition,
): PunchGeolocationResult | null {
  const { latitude, longitude, accuracy } = position.coords;
  if (!isValidLatLng(latitude, longitude)) return null;

  const accuracyM =
    typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0
      ? accuracy
      : undefined;

  // Drop broken browser junk immediately (e.g. ±200000 m).
  if (accuracyM != null && accuracyM > ABSURD_ACCURACY_M) {
    return {
      status: "unavailable",
      accuracy: accuracyM,
    };
  }

  return {
    status: "captured",
    // Full floating-point precision — never round/truncate before save.
    latitude,
    longitude,
    accuracy: accuracyM,
  };
}

function samplePositions(options: {
  maxWaitMs: number;
  enableHighAccuracy: boolean;
}): Promise<PunchGeolocationResult> {
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

      if (next.status === "captured") {
        best = pickBetter(best, next);
      } else if (next.accuracy != null) {
        // Keep absurd accuracy for diagnostics only; never treat as captured.
        best = best ?? { status: "unavailable", accuracy: next.accuracy };
      }

      if (best?.status === "captured" && isExcellent(best.accuracy)) {
        finish(best);
        return;
      }

      if (best?.status === "captured" && firstFixAt == null) {
        firstFixAt = Date.now();
        refineTimer = window.setTimeout(() => {
          if (best?.status === "captured" && isGood(best.accuracy)) {
            finish(best);
          }
        }, REFINE_WINDOW_MS);
      } else if (
        best?.status === "captured" &&
        firstFixAt != null &&
        Date.now() - firstFixAt >= REFINE_WINDOW_MS &&
        isGood(best.accuracy)
      ) {
        finish(best);
      }
    };

    const hardTimer = window.setTimeout(() => {
      if (best?.status === "captured" && isUsableAccuracy(best.accuracy)) {
        finish(best);
        return;
      }
      if (best?.accuracy != null && best.accuracy > ABSURD_ACCURACY_M) {
        finish({ status: "unavailable", accuracy: best.accuracy });
        return;
      }
      finish(best?.status === "captured" ? best : { status: "timeout" });
    }, options.maxWaitMs);

    try {
      navigator.geolocation.getCurrentPosition(
        consider,
        () => {
          // Watch may still succeed.
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          maximumAge: 0,
          timeout: Math.min(8_000, options.maxWaitMs),
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
          enableHighAccuracy: options.enableHighAccuracy,
          maximumAge: 0,
          timeout: options.maxWaitMs,
        },
      );
    } catch {
      finish({ status: "unavailable" });
    }
  });
}

function requestSinglePosition(options: {
  timeoutMs: number;
  enableHighAccuracy: boolean;
}): Promise<PunchGeolocationResult> {
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
      options.timeoutMs + 1_500,
    );

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = normalizeCoords(position);
          if (!next) {
            finish({ status: "unavailable" });
            return;
          }
          if (next.status !== "captured" || !isUsableAccuracy(next.accuracy)) {
            finish({
              status: "unavailable",
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
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeoutMs,
          maximumAge: 0,
        },
      );
    } catch {
      finish({ status: "unavailable" });
    }
  });
}
