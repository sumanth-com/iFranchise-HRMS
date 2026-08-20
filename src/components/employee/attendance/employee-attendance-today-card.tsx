"use client";

import { SelfAttendanceTodayCard } from "@/components/attendance/self-attendance-today-card";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

type Props = {
  firstName: string;
  today: ManagerTodayAttendance;
};

/** @deprecated Use SelfAttendanceTodayCard — kept as alias for existing imports. */
export function EmployeeAttendanceTodayCard(props: Props) {
  return <SelfAttendanceTodayCard {...props} />;
}
