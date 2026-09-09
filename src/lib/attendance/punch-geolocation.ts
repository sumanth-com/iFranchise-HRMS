/**
 * Production attendance geolocation — shared by all self-service portals.
 *
 * Multi-step strategy:
 * 1) High-accuracy GPS (mobile hardware), maximumAge 0, ~10s timeout
 * 2) Soft network/Wi-Fi fallback when high-accuracy times out / is unavailable
 * 3) Keep the best (lowest accuracy meters) valid reading
 *
 * Only invalid / absurd readings are discarded. Imperfect indoor accuracy is saved.
 */

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
  source?: "high_accuracy" | "network_fallback";
};

/** Stop early when we already have an excellent fix. */
const EXCELLENT_ACCURACY_M = 50;
/** Prefer finishing once a solid fix is available. */
const GOOD_ACCURACY_M = 100;
/**
 * Reject only clearly broken browser junk (e.g. ±200000 m).
 * Real indoor / desktop Wi-Fi accuracy is often hundreds–thousands of meters
 * and must still be saved as the nearest available real-world location.
 */
const ABSURD_ACCURACY_M = 100_000;
const HIGH_ACCURACY_TIMEOUT_MS = 10_000;
const NETWORK_FALLBACK_TIMEOUT_MS = 8_000;
/** Brief refine window while collecting multiple high-accuracy samples. */
const REFINE_WINDOW_MS = 2_000;
/** Extra wait only while the browser permission prompt may still be open. */
const PERMISSION_PROMPT_BUDGET_MS = 90_000;

/**
 * Capture the best available fresh employee location for Check In / Check Out.
 * Must be called from a user gesture. Never invents coordinates.
 */
export async function fetchEmployeeLocation(): Promise<PunchGeolocationResult> {
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

  const highAccuracyBudgetMs =
    permissionState === "granted"
      ? HIGH_ACCURACY_TIMEOUT_MS
      : PERMISSION_PROMPT_BUDGET_MS;

  // 1) Fresh high-accuracy GPS (mobile hardware). Collect a few samples; keep best.
  const high = await sampleBestPosition({
    enableHighAccuracy: true,
    timeoutMs: highAccuracyBudgetMs,
    source: "high_accuracy",
  });

  if (high.status === "denied") return { status: "denied" };
  if (isSavableFix(high)) {
    logCapture("high_accuracy", high);
    return high;
  }

  // 2) Automatic Wi-Fi / network fallback for laptops, desktops, Macs, indoor.
  //    Only after TIMEOUT or POSITION_UNAVAILABLE (or empty high-accuracy result).
  if (
    high.status === "timeout" ||
    high.status === "unavailable" ||
    !isSavableFix(high)
  ) {
    const soft = await requestPosition({
      enableHighAccuracy: false,
      timeoutMs: NETWORK_FALLBACK_TIMEOUT_MS,
      source: "network_fallback",
    });

    if (soft.status === "denied") return { status: "denied" };
    if (isSavableFix(soft)) {
      logCapture("network_fallback", soft);
      return soft;
    }

    // Prefer any valid sample we already saw (high pass may have had coords
    // rejected only by a transient classification bug).
    const best = pickBestSavable(high, soft);
    if (best) {
      logCapture("best_available", best);
      return best;
    }

    if (
      (high.accuracy != null && high.accuracy > ABSURD_ACCURACY_M) ||
      (soft.accuracy != null && soft.accuracy > ABSURD_ACCURACY_M)
    ) {
      console.warn("[fetchEmployeeLocation] discarded absurd accuracy", {
        highAccuracyM: high.accuracy,
        softAccuracyM: soft.accuracy,
      });
    }

    return {
      status:
        high.status === "timeout" || soft.status === "timeout"
          ? "timeout"
          : "unavailable",
      sampleCount: (high.sampleCount ?? 0) + (soft.sampleCount ?? 0),
    };
  }

  return high;
}

/** @deprecated Prefer {@link fetchEmployeeLocation}. Kept for existing imports. */
export async function getOptionalPunchGeolocation(): Promise<PunchGeolocationResult> {
  return fetchEmployeeLocation();
}

function logCapture(label: string, geo: PunchGeolocationResult) {
  console.info(`[fetchEmployeeLocation] ${label}`, {
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracyM: geo.accuracy,
    sampleCount: geo.sampleCount,
    source: geo.source,
  });
}

function isValidLatLng(latitude: number, longitude: number): boolean {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
}

/** Coordinates we are willing to persist (imperfect accuracy is OK). */
function isSavableFix(geo: PunchGeolocationResult | null | undefined): boolean {
  if (!geo || geo.status !== "captured") return false;
  if (geo.latitude == null || geo.longitude == null) return false;
  if (!isValidLatLng(geo.latitude, geo.longitude)) return false;
  if (geo.accuracy != null) {
    if (!Number.isFinite(geo.accuracy) || geo.accuracy < 0) return false;
    if (geo.accuracy > ABSURD_ACCURACY_M) return false;
  }
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

function pickBetter(
  a: PunchGeolocationResult | null,
  b: PunchGeolocationResult | null,
): PunchGeolocationResult | null {
  if (!a) return b;
  if (!b) return a;
  if (!isSavableFix(a)) return isSavableFix(b) ? b : a;
  if (!isSavableFix(b)) return a;
  const aAcc = a.accuracy;
  const bAcc = b.accuracy;
  if (aAcc == null) return bAcc == null ? a : b;
  if (bAcc == null) return a;
  return aAcc <= bAcc ? a : b;
}

function pickBestSavable(
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
    best = pickBetter(best, { ...candidate, status: "captured" });
  }
  return best && isSavableFix(best) ? best : null;
}

function normalizePosition(
  position: GeolocationPosition,
  source: PunchGeolocationResult["source"],
): PunchGeolocationResult {
  const { latitude, longitude, accuracy } = position.coords;
  if (!isValidLatLng(latitude, longitude)) {
    return { status: "unavailable", source };
  }

  const accuracyM =
    typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0
      ? accuracy
      : undefined;

  if (accuracyM != null && accuracyM > ABSURD_ACCURACY_M) {
    return { status: "unavailable", accuracy: accuracyM, source };
  }

  return {
    status: "captured",
    // Full floating-point precision — never round/truncate before save.
    latitude,
    longitude,
    accuracy: accuracyM,
    source,
  };
}

function mapGeoError(error: GeolocationPositionError): PunchGeolocationStatus {
  if (error.code === error.PERMISSION_DENIED) return "denied";
  if (error.code === error.TIMEOUT) return "timeout";
  return "unavailable";
}

function requestPosition(options: {
  enableHighAccuracy: boolean;
  timeoutMs: number;
  source: NonNullable<PunchGeolocationResult["source"]>;
}): Promise<PunchGeolocationResult> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: PunchGeolocationResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      resolve({ ...value, sampleCount: value.sampleCount ?? 1 });
    };

    const safetyTimer = window.setTimeout(
      () => finish({ status: "timeout", source: options.source }),
      options.timeoutMs + 1_500,
    );

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const next = normalizePosition(position, options.source);
          finish(next);
        },
        (error) => {
          finish({ status: mapGeoError(error), source: options.source });
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeoutMs,
          maximumAge: 0,
        },
      );
    } catch {
      finish({ status: "unavailable", source: options.source });
    }
  });
}

/**
 * Collect multiple fresh readings and return the best (lowest accuracy).
 * Exits early on excellent/good fixes so punch stays fast.
 */
function sampleBestPosition(options: {
  enableHighAccuracy: boolean;
  timeoutMs: number;
  source: NonNullable<PunchGeolocationResult["source"]>;
}): Promise<PunchGeolocationResult> {
  return new Promise((resolve) => {
    let settled = false;
    let best: PunchGeolocationResult | null = null;
    let sampleCount = 0;
    let firstFixAt: number | null = null;
    let watchId: number | null = null;
    let refineTimer: number | null = null;
    let lastError: PunchGeolocationStatus | null = null;

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
      resolve({ ...value, sampleCount, source: options.source });
    };

    const consider = (position: GeolocationPosition) => {
      const next = normalizePosition(position, options.source);
      sampleCount += 1;

      if (next.status === "captured") {
        best = pickBetter(best, next);
      } else if (next.accuracy != null) {
        lastError = "unavailable";
      }

      if (best && isSavableFix(best) && isExcellent(best.accuracy)) {
        finish(best);
        return;
      }

      if (best && isSavableFix(best) && firstFixAt == null) {
        firstFixAt = Date.now();
        refineTimer = window.setTimeout(() => {
          if (best && isSavableFix(best) && isGood(best.accuracy)) {
            finish(best);
          }
        }, REFINE_WINDOW_MS);
      } else if (
        best &&
        isSavableFix(best) &&
        firstFixAt != null &&
        Date.now() - firstFixAt >= REFINE_WINDOW_MS &&
        isGood(best.accuracy)
      ) {
        finish(best);
      }
    };

    const hardTimer = window.setTimeout(() => {
      if (best && isSavableFix(best)) {
        finish(best);
        return;
      }
      finish({
        status: lastError ?? "timeout",
        accuracy: best?.accuracy,
        source: options.source,
      });
    }, options.timeoutMs);

    try {
      navigator.geolocation.getCurrentPosition(
        consider,
        (error) => {
          lastError = mapGeoError(error);
          if (lastError === "denied") {
            finish({ status: "denied", source: options.source });
          }
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          maximumAge: 0,
          timeout: Math.min(HIGH_ACCURACY_TIMEOUT_MS, options.timeoutMs),
        },
      );

      watchId = navigator.geolocation.watchPosition(
        consider,
        (error) => {
          lastError = mapGeoError(error);
          if (lastError === "denied") {
            finish({ status: "denied", source: options.source });
          }
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          maximumAge: 0,
          timeout: options.timeoutMs,
        },
      );
    } catch {
      finish({ status: "unavailable", source: options.source });
    }
  });
}
