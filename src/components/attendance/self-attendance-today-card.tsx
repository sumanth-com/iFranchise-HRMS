"use client";

import { AttendanceTodayPunchCard } from "@/components/employee/attendance/attendance-today-punch-card";
import {
  selfAttendancePunchAction,
  selfAttendanceUpdateCheckoutAction,
} from "@/lib/attendance/actions/self-attendance-punch-actions";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

type Props = {
  firstName: string;
  today: ManagerTodayAttendance;
};

/** Shared check-in/out card for every self-service portal (HR, employee, manager, system). */
export function SelfAttendanceTodayCard({ firstName, today }: Props) {
  return (
    <AttendanceTodayPunchCard
      firstName={firstName}
      today={today}
      onCheckIn={() => selfAttendancePunchAction({ type: "in" })}
      onCheckOut={() => selfAttendancePunchAction({ type: "out" })}
      onUpdateCheckout={() =>
        selfAttendanceUpdateCheckoutAction({
          attendanceId: today.attendanceId ?? undefined,
        })
      }
    />
  );
}
