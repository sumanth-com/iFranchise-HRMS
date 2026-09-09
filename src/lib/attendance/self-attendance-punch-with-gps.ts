"use client";

import { toast } from "sonner";

import {
  selfAttendancePunchAction,
  selfAttendanceUpdateCheckoutAction,
  type SelfAttendancePunchResult,
} from "@/lib/attendance/actions/self-attendance-punch-actions";
import {
  getOptionalPunchGeolocation,
  type PunchGeolocationResult,
} from "@/lib/attendance/punch-geolocation";

function geoUserMessage(geo: PunchGeolocationResult): string {
  switch (geo.status) {
    case "denied":
      return "Location permission is blocked. Enable precise location for this site, then try again.";
    case "timeout":
      return "Could not get a fresh GPS fix in time. Move near a window or outdoors and try again.";
    case "unsupported":
      return "This browser does not support GPS. Attendance time will still be saved without location.";
    case "poor_accuracy":
      return geo.accuracy != null
        ? `GPS accuracy is too low (±${Math.round(geo.accuracy)} m). Move for a clearer signal and try again — inaccurate location was not saved.`
        : "GPS accuracy is too low. Move for a clearer signal and try again — inaccurate location was not saved.";
    default:
      return "Could not capture your exact GPS location. Attendance time will still be saved without location.";
  }
}

function geoPayload(geo: PunchGeolocationResult): {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
} {
  // Never forward approximate/poor fixes — only a verified high-accuracy capture.
  if (geo.status !== "captured") return {};
  return {
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy,
  };
}

async function captureFreshPunchGps(label: "check-in" | "check-out") {
  const loadingId = toast.loading(
    label === "check-in"
      ? "Capturing high-accuracy check-in GPS…"
      : "Capturing high-accuracy check-out GPS…",
  );

  try {
    return await getOptionalPunchGeolocation();
  } finally {
    toast.dismiss(loadingId);
  }
}

export async function punchSelfAttendanceWithFreshGps(
  type: "in" | "out",
): Promise<SelfAttendancePunchResult> {
  const geo = await captureFreshPunchGps(type === "in" ? "check-in" : "check-out");
  const captured = geo.status === "captured";

  if (!captured) {
    toast.error(geoUserMessage(geo), { duration: 5500 });
  } else {
    console.info("[self-attendance] punch GPS ready", {
      type,
      latitude: geo.latitude,
      longitude: geo.longitude,
      accuracyM: geo.accuracy,
    });
  }

  const result = await selfAttendancePunchAction({
    type,
    ...geoPayload(geo),
  });

  if (result.success && captured) {
    const saved =
      type === "in"
        ? Boolean(result.today?.hasCheckInLocation)
        : Boolean(result.today?.hasCheckOutLocation);
    if (!saved) {
      toast.error(
        type === "in"
          ? "Checked in, but exact GPS was not saved. Enable precise location and try Update Check Out later if needed."
          : "Checked out, but exact GPS was not saved. Enable precise location and use Update Check Out.",
        { duration: 5000 },
      );
    }
  }

  return result;
}

export async function updateCheckoutWithFreshGps(
  attendanceId?: string | null,
): Promise<SelfAttendancePunchResult> {
  const geo = await captureFreshPunchGps("check-out");
  const captured = geo.status === "captured";

  if (!captured) {
    toast.error(geoUserMessage(geo), { duration: 5500 });
  } else {
    console.info("[self-attendance] update-checkout GPS ready", {
      latitude: geo.latitude,
      longitude: geo.longitude,
      accuracyM: geo.accuracy,
    });
  }

  const result = await selfAttendanceUpdateCheckoutAction({
    attendanceId: attendanceId ?? undefined,
    ...geoPayload(geo),
  });

  if (result.success && captured && !result.today?.hasCheckOutLocation) {
    toast.error("Checkout updated, but exact GPS was not saved.", {
      duration: 4500,
    });
  }

  return result;
}
