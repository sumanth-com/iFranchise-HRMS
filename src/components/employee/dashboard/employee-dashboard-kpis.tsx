import { CalendarClock, CalendarDays, Clock, Timer } from "lucide-react";

import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import { formatHoursLabel } from "@/lib/employee/attendance-format";
import type { EmployeeDashboardKpis } from "@/types/employee-dashboard";

function attendanceLabel(kpis: EmployeeDashboardKpis) {
  if (kpis.attendanceStatus) {
    return ATTENDANCE_STATUS_LABELS[kpis.attendanceStatus] ?? kpis.attendanceStatus;
  }
  switch (kpis.attendancePunchState) {
    case "checked_in":
      return "Checked In";
    case "checked_out":
      return "Checked Out";
    case "locked":
      return "Locked";
    default:
      return "Not Marked";
  }
}

export function EmployeeDashboardKpiCards({ kpis }: { kpis: EmployeeDashboardKpis }) {
  return (
    <section
      aria-label="Your day at a glance"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
      <EmployeeStatCard
        label="Today's Attendance"
        value={attendanceLabel(kpis)}
        icon={CalendarClock}
        accent="text-emerald-600 dark:text-emerald-400"
        iconBg="bg-emerald-500/10"
      />
      <EmployeeStatCard
        label="Working Hours Today"
        value={formatHoursLabel(kpis.workingHours)}
        icon={Timer}
        accent="text-sky-600 dark:text-sky-400"
        iconBg="bg-sky-500/10"
      />
      <EmployeeStatCard
        label="Leave Balance"
        value={`${kpis.leaveBalanceDays} days`}
        icon={CalendarDays}
        accent="text-indigo-600 dark:text-indigo-400"
        iconBg="bg-indigo-500/10"
      />
      <EmployeeStatCard
        label="Pending Leave Requests"
        value={String(kpis.pendingLeaveRequests)}
        icon={Clock}
        accent="text-amber-600 dark:text-amber-400"
        iconBg="bg-amber-500/10"
      />
    </section>
  );
}
