"use client";

import { toast } from "sonner";

import { AttendanceTodayPunchCard } from "@/components/employee/attendance/attendance-today-punch-card";
import {
  selfAttendancePunchAction,
  selfAttendanceUpdateCheckoutAction,
} from "@/lib/attendance/actions/self-attendance-punch-actions";
import { getOptionalPunchGeolocation } from "@/lib/attendance/punch-geolocation";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

type Props = {
  firstName: string;
  today: ManagerTodayAttendance;
  /** HR / executive only. Defaults to false (employee read-only after checkout). */
  allowUpdateCheckout?: boolean;
};

function geoUserMessage(status: string): string {
  switch (status) {
    case "denied":
      return "Location permission is blocked. Enable location for this site in your browser settings.";
    case "timeout":
      return "Could not get your location in time. Check GPS signal and try again.";
    case "unsupported":
      return "This browser does not support location. Attendance time will still be saved.";
    default:
      return "Could not capture your current location. Attendance time will still be saved.";
  }
}

async function punchWithGeo(type: "in" | "out") {
  const loadingId = toast.loading(
    type === "in" ? "Getting check-in location…" : "Getting check-out location…",
  );

  let geo;
  try {
    geo = await getOptionalPunchGeolocation();
  } finally {
    toast.dismiss(loadingId);
  }

  const captured = geo.status === "captured";
  if (!captured) {
    toast.error(geoUserMessage(geo.status), { duration: 4500 });
  }

  const result = await selfAttendancePunchAction({
    type,
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy,
  });

  if (result.success && captured) {
    const saved =
      type === "in"
        ? Boolean(result.today?.hasCheckInLocation)
        : Boolean(result.today?.hasCheckOutLocation);
    if (!saved) {
      toast.error(
        type === "in"
          ? "Checked in, but GPS was not saved. Try Check Out later with location enabled."
          : "Checked out, but GPS was not saved. Enable location and use Update Check Out if available.",
        { duration: 5000 },
      );
    }
  }

  return result;
}

async function updateCheckoutWithGeo(attendanceId: string | null) {
  const loadingId = toast.loading("Getting check-out location…");
  let geo;
  try {
    geo = await getOptionalPunchGeolocation();
  } finally {
    toast.dismiss(loadingId);
  }

  const captured = geo.status === "captured";
  if (!captured) {
    toast.error(geoUserMessage(geo.status), { duration: 4500 });
  }

  const result = await selfAttendanceUpdateCheckoutAction({
    attendanceId: attendanceId ?? undefined,
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy,
  });

  if (result.success && captured && !result.today?.hasCheckOutLocation) {
    toast.error("Checkout updated, but GPS was not saved.", { duration: 4500 });
  }

  return result;
}

/** Shared check-in/out card for every self-service portal (HR, employee, manager, system). */
export function SelfAttendanceTodayCard({
  firstName,
  today,
  allowUpdateCheckout = false,
}: Props) {
  return (
    <AttendanceTodayPunchCard
      firstName={firstName}
      today={today}
      allowUpdateCheckout={allowUpdateCheckout}
      onCheckIn={() => punchWithGeo("in")}
      onCheckOut={() => punchWithGeo("out")}
      onUpdateCheckout={() => updateCheckoutWithGeo(null)}
    />
  );
}
