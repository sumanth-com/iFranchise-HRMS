"use client";

import type { ReactNode } from "react";

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
  compact?: boolean;
  fillHeight?: boolean;
  extraActions?: ReactNode;
  heading?: ReactNode;
};

/** Shared check-in/out card for every self-service portal (HR, employee, manager, system). */
export function SelfAttendanceTodayCard({
  firstName,
  today,
  allowUpdateCheckout = true,
  compact,
  fillHeight,
  extraActions,
  heading,
}: Props) {
  return (
    <AttendanceTodayPunchCard
      firstName={firstName}
      today={today}
      allowUpdateCheckout={allowUpdateCheckout}
      compact={compact}
      fillHeight={fillHeight}
      extraActions={extraActions}
      heading={heading}
      onCheckIn={() => punchSelfAttendanceWithFreshGps("in")}
      onCheckOut={() => punchSelfAttendanceWithFreshGps("out")}
      onUpdateCheckout={() => updateCheckoutWithFreshGps(null)}
    />
  );
}
