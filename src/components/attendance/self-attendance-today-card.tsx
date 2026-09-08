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

async function punchWithOptionalGeo(type: "in" | "out") {
  const loadingId = toast.loading("Requesting location…");
  const geo = await getOptionalPunchGeolocation();
  toast.dismiss(loadingId);

  if (geo.status === "denied") {
    toast.message("Location permission denied", {
      description:
        "Attendance will continue without GPS. You can enable location in browser settings for future punches.",
    });
  } else if (geo.status === "captured") {
    // Keep quiet on success — history pin becomes the confirmation.
  } else if (geo.status !== "unsupported") {
    toast.message("Location not recorded", {
      description:
        "Could not capture GPS for this punch. Attendance will still be saved normally.",
    });
  }

  return selfAttendancePunchAction({
    type,
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
      onCheckIn={() => punchWithOptionalGeo("in")}
      onCheckOut={() => punchWithOptionalGeo("out")}
      onUpdateCheckout={() =>
        selfAttendanceUpdateCheckoutAction({
          attendanceId: today.attendanceId ?? undefined,
        })
      }
    />
  );
}
