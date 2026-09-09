"use client";

import { toast } from "sonner";

import {
  selfAttendancePunchAction,
  selfAttendanceUpdateCheckoutAction,
  type SelfAttendancePunchResult,
} from "@/lib/attendance/actions/self-attendance-punch-actions";
import {
  fetchEmployeeLocation,
  type PunchGeolocationResult,
} from "@/lib/attendance/punch-geolocation";

function geoUnavailableMessage(geo: PunchGeolocationResult): string {
  switch (geo.status) {
    case "denied":
      return "Location permission is blocked. Your attendance time was still saved — enable location for this site in browser settings for next time.";
    case "timeout":
      return "Could not get your location in time. Your attendance time was still saved. Try near a window or with Wi‑Fi on next time.";
    case "unsupported":
      return "This browser cannot share location. Your attendance time was still saved.";
    default:
      return "Location unavailable right now. Your attendance time was still saved.";
  }
}

function geoPayload(geo: PunchGeolocationResult): {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
} {
  if (geo.status !== "captured") return {};
  if (geo.latitude == null || geo.longitude == null) return {};
  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy,
  };
}

async function captureFreshPunchGps() {
  const loadingId = toast.loading("Capturing your location…");
  try {
    return await fetchEmployeeLocation();
  } finally {
    toast.dismiss(loadingId);
  }
}

export async function punchSelfAttendanceWithFreshGps(
  type: "in" | "out",
): Promise<SelfAttendancePunchResult> {
  // Fresh capture every punch — never reuse prior check-in/out coordinates.
  const geo = await captureFreshPunchGps();
  const captured = geo.status === "captured";

  if (captured) {
    console.info("[self-attendance] punch GPS ready", {
      type,
      latitude: geo.latitude,
      longitude: geo.longitude,
      accuracyM: geo.accuracy,
      source: geo.source,
    });
  }

  // Attendance time must succeed even when GPS is unavailable.
  const result = await selfAttendancePunchAction({
    type,
    ...geoPayload(geo),
  });

  if (!result.success) {
    return result;
  }

  if (captured) {
    const saved =
      type === "in"
        ? Boolean(result.today?.hasCheckInLocation)
        : Boolean(result.today?.hasCheckOutLocation);
    if (saved) {
      toast.success("Location captured successfully", { duration: 2500 });
    } else {
      // Do not claim success if DB verification failed.
      toast.message(
        type === "in"
          ? "Checked in. Location could not be stored this time."
          : "Checked out. Location could not be stored this time.",
        { duration: 4500 },
      );
    }
  } else {
    toast.message(geoUnavailableMessage(geo), { duration: 4500 });
  }

  return result;
}

export async function updateCheckoutWithFreshGps(
  attendanceId?: string | null,
): Promise<SelfAttendancePunchResult> {
  const geo = await captureFreshPunchGps();
  const captured = geo.status === "captured";

  if (captured) {
    console.info("[self-attendance] update-checkout GPS ready", {
      latitude: geo.latitude,
      longitude: geo.longitude,
      accuracyM: geo.accuracy,
      source: geo.source,
    });
  }

  const result = await selfAttendanceUpdateCheckoutAction({
    attendanceId: attendanceId ?? undefined,
    ...geoPayload(geo),
  });

  if (!result.success) {
    return result;
  }

  if (captured) {
    if (result.today?.hasCheckOutLocation) {
      toast.success("Location captured successfully", { duration: 2500 });
    } else {
      toast.message("Checkout updated. Location could not be stored this time.", {
        duration: 4500,
      });
    }
  } else {
    toast.message(geoUnavailableMessage(geo), { duration: 4500 });
  }

  return result;
}
