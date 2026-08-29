"use client";

import { CalendarClock, CalendarDays, Clock, Timer } from "lucide-react";
import { usePathname } from "next/navigation";

import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { useLiveWorkingSeconds } from "@/hooks/use-live-working-seconds";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import { formatWorkingDuration } from "@/lib/employee/attendance-format";
import {
  EMPLOYEE_DASHBOARD_KPI_LINKS,
  EMPLOYEE_ROUTES,
  HR_SELF_SERVICE_DASHBOARD_KPI_LINKS,
} from "@/lib/employee/constants";
import { formatLeaveDayCount } from "@/lib/leave/services/leave-usage";
import { MANAGER_ROUTES, MANAGER_SELF_SERVICE_DASHBOARD_KPI_LINKS } from "@/lib/manager/constants";
import {
  SUPER_ADMIN_SELF_SERVICE_DASHBOARD_KPI_LINKS,
  SYSTEM_ADMIN_ROUTES,
} from "@/lib/system-admin/constants";
import type { EmployeeDashboardKpis } from "@/types/employee-dashboard";
import type { ManagerTodayAttendance } from "@/types/manager-self-attendance";

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

function resolveKpiLinks(pathname: string) {
  if (pathname.startsWith(EMPLOYEE_ROUTES.home)) {
    return EMPLOYEE_DASHBOARD_KPI_LINKS;
  }
  if (pathname.startsWith(MANAGER_ROUTES.home)) {
    return MANAGER_SELF_SERVICE_DASHBOARD_KPI_LINKS;
  }
  if (pathname === SYSTEM_ADMIN_ROUTES.home || pathname.startsWith(`${SYSTEM_ADMIN_ROUTES.home}/`)) {
    return SUPER_ADMIN_SELF_SERVICE_DASHBOARD_KPI_LINKS;
  }
  return HR_SELF_SERVICE_DASHBOARD_KPI_LINKS;
}

export function EmployeeDashboardKpiCards({
  kpis,
  today,
  hideLeaveBalance = false,
}: {
  kpis: EmployeeDashboardKpis;
  today: Pick<ManagerTodayAttendance, "checkInAt" | "checkOutAt">;
  hideLeaveBalance?: boolean;
}) {
  const pathname = usePathname();
  const links = resolveKpiLinks(pathname);
  const workingSeconds = useLiveWorkingSeconds(today.checkInAt, today.checkOutAt);

  return (
    <section
      aria-label="Your day at a glance"
      className={
        hideLeaveBalance
          ? "grid grid-cols-2 gap-3 lg:grid-cols-3"
          : "grid grid-cols-2 gap-3 lg:grid-cols-4"
      }
    >
      <EmployeeStatCard
        label="Today's Attendance"
        value={attendanceLabel(kpis)}
        hint="Status"
        icon={CalendarClock}
        accent="text-emerald-600 dark:text-emerald-400"
        iconBg="bg-emerald-500/10"
        tone="emerald"
        href={links.attendance}
      />
      <EmployeeStatCard
        label="Working Hours Today"
        value={formatWorkingDuration(workingSeconds)}
        hint="Duration"
        icon={Timer}
        accent="text-sky-600 dark:text-sky-400"
        iconBg="bg-sky-500/10"
        tone="sky"
        href={links.workingHours}
      />
      {hideLeaveBalance ? null : (
        <EmployeeStatCard
          label="Leave Balance"
          value={`${formatLeaveDayCount(kpis.leaveBalanceDays)} days`}
          hint="Available"
          icon={CalendarDays}
          accent="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-500/10"
          tone="violet"
          href={links.leaveBalance}
        />
      )}
      <EmployeeStatCard
        label="Pending Leave Requests"
        value={String(kpis.pendingLeaveRequests)}
        hint={kpis.pendingLeaveRequests === 1 ? "Request" : "Requests"}
        icon={Clock}
        accent="text-amber-600 dark:text-amber-400"
        iconBg="bg-amber-500/10"
        tone="amber"
        href={links.pendingLeaveRequests}
      />
    </section>
  );
}
