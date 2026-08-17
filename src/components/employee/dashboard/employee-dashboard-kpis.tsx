"use client";

import { CalendarClock, CalendarDays, Clock, Timer } from "lucide-react";
import { usePathname } from "next/navigation";

import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import { formatHoursLabel } from "@/lib/employee/attendance-format";
import {
  EMPLOYEE_DASHBOARD_KPI_LINKS,
  EMPLOYEE_ROUTES,
  HR_SELF_SERVICE_DASHBOARD_KPI_LINKS,
} from "@/lib/employee/constants";
import { MANAGER_ROUTES, MANAGER_SELF_SERVICE_DASHBOARD_KPI_LINKS } from "@/lib/manager/constants";
import {
  SUPER_ADMIN_SELF_SERVICE_DASHBOARD_KPI_LINKS,
  SYSTEM_ADMIN_ROUTES,
} from "@/lib/system-admin/constants";
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

export function EmployeeDashboardKpiCards({ kpis }: { kpis: EmployeeDashboardKpis }) {
  const pathname = usePathname();
  const links = resolveKpiLinks(pathname);

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
        href={links.attendance}
      />
      <EmployeeStatCard
        label="Working Hours Today"
        value={formatHoursLabel(kpis.workingHours)}
        icon={Timer}
        accent="text-sky-600 dark:text-sky-400"
        iconBg="bg-sky-500/10"
        href={links.workingHours}
      />
      <EmployeeStatCard
        label="Leave Balance"
        value={`${kpis.leaveBalanceDays} days`}
        icon={CalendarDays}
        accent="text-indigo-600 dark:text-indigo-400"
        iconBg="bg-indigo-500/10"
        href={links.leaveBalance}
      />
      <EmployeeStatCard
        label="Pending Leave Requests"
        value={String(kpis.pendingLeaveRequests)}
        icon={Clock}
        accent="text-amber-600 dark:text-amber-400"
        iconBg="bg-amber-500/10"
        href={links.pendingLeaveRequests}
      />
    </section>
  );
}
