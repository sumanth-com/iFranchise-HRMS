export type PunchGeolocationResult = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  /** Why coordinates may be missing — never blocks punch. */
  status: "captured" | "denied" | "unavailable" | "timeout" | "unsupported";
};

/**
 * Best-effort browser geolocation for punch capture.
 * Must be called from a user gesture (Check In / Check Out click).
 *
 * Important: do not abandon the request while the browser permission dialog
 * is still open — a short timer caused Check In to continue with empty GPS.
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

  // Allow long wait when the browser may still show the permission prompt.
  const timeoutMs = permissionState === "granted" ? 12_000 : 90_000;

  const position = await requestPosition({
    enableHighAccuracy: true,
    timeoutMs,
    maximumAgeMs: 0,
  });

  if (position?.status === "captured") {
    return position;
  }

  // One softer fallback if high-accuracy timed out after permission was granted.
  if (permissionState === "granted" && position?.status === "timeout") {
    const fallback = await requestPosition({
      enableHighAccuracy: false,
      timeoutMs: 8_000,
      maximumAgeMs: 30_000,
    });
    if (fallback?.status === "captured") return fallback;
    return fallback ?? { status: "timeout" };
  }

  return position ?? { status: "unavailable" };
}

function requestPosition(options: {
  enableHighAccuracy: boolean;
  timeoutMs: number;
  maximumAgeMs: number;
}): Promise<PunchGeolocationResult> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (value: PunchGeolocationResult) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    // Safety net only — keep this above the browser dialog wait window.
    const safetyTimer = window.setTimeout(
      () => finish({ status: "timeout" }),
      options.timeoutMs + 2_000,
    );

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          window.clearTimeout(safetyTimer);
          const { latitude, longitude, accuracy } = position.coords;
          if (
            typeof latitude !== "number" ||
            typeof longitude !== "number" ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            (latitude === 0 && longitude === 0)
          ) {
            finish({ status: "unavailable" });
            return;
          }
          finish({
            status: "captured",
            latitude,
            longitude,
            accuracy:
              typeof accuracy === "number" && Number.isFinite(accuracy) && accuracy >= 0
                ? accuracy
                : undefined,
          });
        },
        (error) => {
          window.clearTimeout(safetyTimer);
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
          maximumAge: options.maximumAgeMs,
        },
      );
    } catch {
      window.clearTimeout(safetyTimer);
      finish({ status: "unavailable" });
    }
  });
}
