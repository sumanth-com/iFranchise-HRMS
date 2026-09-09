"use client";

import { AttendanceTodayPunchCard } from "@/components/employee/attendance/attendance-today-punch-card";
import {
  punchSelfAttendanceWithFreshGps,
  updateCheckoutWithFreshGps,
} from "@/lib/attendance/self-attendance-punch-with-gps";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

type Props = {
  firstName: string;
  today: ManagerTodayAttendance;
  /** Kept for call-site compatibility; Update Check Out is available to all employees. */
  allowUpdateCheckout?: boolean;
};

/** Shared check-in/out card for every self-service portal (HR, employee, manager, system). */
export function SelfAttendanceTodayCard({
  firstName,
  today,
  allowUpdateCheckout = true,
}: Props) {
  return (
    <AttendanceTodayPunchCard
      firstName={firstName}
      today={today}
      allowUpdateCheckout={allowUpdateCheckout}
      onCheckIn={() => punchSelfAttendanceWithFreshGps("in")}
      onCheckOut={() => punchSelfAttendanceWithFreshGps("out")}
      onUpdateCheckout={() => updateCheckoutWithFreshGps(null)}
    />
  );
}
