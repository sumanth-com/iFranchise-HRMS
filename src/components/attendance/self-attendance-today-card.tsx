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

  if (geo.status === "captured") {
    // Quiet success — history pin confirms GPS later.
  } else {
    toast.error(geoUserMessage(geo.status), { duration: 4200 });
  }

  return selfAttendancePunchAction({
    type,
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy,
  });
}

async function updateCheckoutWithGeo(attendanceId: string | null) {
  const loadingId = toast.loading("Getting check-out location…");
  let geo;
  try {
    geo = await getOptionalPunchGeolocation();
  } finally {
    toast.dismiss(loadingId);
  }

  if (geo.status !== "captured") {
    toast.error(geoUserMessage(geo.status), { duration: 4200 });
  }

  return selfAttendanceUpdateCheckoutAction({
    attendanceId: attendanceId ?? undefined,
    latitude: geo.latitude,
    longitude: geo.longitude,
    accuracy: geo.accuracy,
  });
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
