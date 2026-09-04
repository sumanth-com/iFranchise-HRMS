"use client";

import { useMemo } from "react";
import {
  Cake,
  CalendarClock,
  ClipboardList,
  Clock3,
  Package,
  Palmtree,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  Wallet,
} from "lucide-react";

import { ErrorState } from "@/components/common";
import {
  EmployeeSectionCard,
  EmployeeStatCard,
} from "@/components/employee/dashboard/employee-module-primitives";
import { ASSETS_ROUTES } from "@/lib/assets/constants";
import { DASHBOARD_ACTION_LINKS, DASHBOARD_KPI_LINKS } from "@/lib/dashboard/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import type { HrDashboardData } from "@/types/dashboard";

type Props = {
  data: HrDashboardData;
  permissionCodes: string[];
  error?: string | null;
};

const HR_FOCUS_IDS = [
  "payroll-due",
  "interviews-today",
  "on-leave",
  "onboarding-review",
] as const;

export function HrDashboard({ data, error }: Props) {
  const focusById = useMemo(() => {
    const map = new Map<string, (typeof data.tasks)[number]>();
    for (const task of data.tasks) {
      if ((HR_FOCUS_IDS as readonly string[]).includes(task.id)) {
        map.set(task.id, task);
      }
    }
    return map;
  }, [data.tasks]);

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
        <ErrorState title="Unable to load dashboard" description={error} />
      </div>
    );
  }

  const { todayPulse, kpis, secondary } = data;

  const payrollTask = focusById.get("payroll-due");
  const interviewsTask = focusById.get("interviews-today");
  const onLeaveTask = focusById.get("on-leave");
  const onboardingTask = focusById.get("onboarding-review");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4">
      <div className="mx-auto flex w-full min-w-0 max-w-[88rem] flex-1 min-h-0 flex-col gap-3">
        <EmployeeSectionCard
          compact
          title="Today's Pulse"
          description="Live workforce snapshot for today"
          className="shrink-0 p-3.5 md:p-4"
          bodyClassName="min-w-0"
        >
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
            <EmployeeStatCard
              compact
              label="Present Today"
              value={String(todayPulse.presentToday)}
              hint="On site"
              icon={UserCheck}
              tone="emerald"
              accent="text-emerald-600 dark:text-emerald-400"
              iconBg="bg-emerald-500/10"
              href={DASHBOARD_KPI_LINKS.presentToday}
            />
            <EmployeeStatCard
              compact
              label="Absent Today"
              value={String(todayPulse.absentToday)}
              hint="Away"
              icon={UserX}
              tone="rose"
              accent="text-rose-600 dark:text-rose-400"
              iconBg="bg-rose-500/10"
              href={DASHBOARD_KPI_LINKS.absentToday}
            />
            <EmployeeStatCard
              compact
              label="Late Employees"
              value={String(todayPulse.lateToday)}
              hint="Delayed"
              icon={Clock3}
              tone="amber"
              accent="text-amber-600 dark:text-amber-400"
              iconBg="bg-amber-500/10"
              href={DASHBOARD_KPI_LINKS.lateToday}
            />
            <EmployeeStatCard
              compact
              label="Pending Approvals"
              value={String(todayPulse.pendingApprovals)}
              hint="Leave queue"
              icon={Sparkles}
              tone="violet"
              accent="text-violet-600 dark:text-violet-400"
              iconBg="bg-violet-500/10"
              href={DASHBOARD_KPI_LINKS.pendingLeaveApprovals}
            />
          </div>
        </EmployeeSectionCard>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <EmployeeSectionCard
            compact
            title="Focus Today"
            description="Payroll, interviews, leave, and onboarding priorities"
            className="flex min-h-0 flex-1 flex-col p-3.5 md:p-4"
            bodyClassName="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
              <EmployeeStatCard
                tall
                showWave={false}
                label={payrollTask?.label ?? "Payroll Due This Month"}
                value={String(payrollTask?.count ?? 0)}
                hint="Due now"
                icon={Wallet}
                tone="violet"
                accent="text-violet-600 dark:text-violet-400"
                iconBg="bg-violet-500/10"
                href={payrollTask?.href ?? DASHBOARD_ACTION_LINKS.payrollDue}
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label={interviewsTask?.label ?? "Interviews Today"}
                value={String(interviewsTask?.count ?? secondary.interviewsToday)}
                hint="Scheduled"
                icon={CalendarClock}
                tone="sky"
                accent="text-sky-600 dark:text-sky-400"
                iconBg="bg-sky-500/10"
                href={interviewsTask?.href ?? DASHBOARD_ACTION_LINKS.interviewsToday}
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label={onLeaveTask?.label ?? "On Leave"}
                value={String(onLeaveTask?.count ?? 0)}
                hint="Today"
                icon={Palmtree}
                tone="amber"
                accent="text-amber-600 dark:text-amber-400"
                iconBg="bg-amber-500/10"
                href={onLeaveTask?.href ?? DASHBOARD_ACTION_LINKS.onLeaveToday}
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label={onboardingTask?.label ?? "Onboarding"}
                value={String(onboardingTask?.count ?? 0)}
                hint="Ready"
                icon={UserPlus}
                tone="emerald"
                accent="text-emerald-600 dark:text-emerald-400"
                iconBg="bg-emerald-500/10"
                href={onboardingTask?.href ?? DASHBOARD_ACTION_LINKS.onboardingReview}
              />
            </div>
          </EmployeeSectionCard>

          <EmployeeSectionCard
            compact
            title="People Focus"
            description="Headcount, assets, exits, and upcoming celebrations"
            className="flex min-h-0 flex-1 flex-col p-3.5 md:p-4"
            bodyClassName="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4 xl:items-stretch">
              <EmployeeStatCard
                tall
                showWave={false}
                label="Active Employees"
                value={String(kpis.totalEmployees)}
                hint="Workforce"
                icon={Users}
                tone="sky"
                accent="text-sky-600 dark:text-sky-400"
                iconBg="bg-sky-500/10"
                href={EMPLOYEE_ROUTES.list}
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label="Company Assets"
                value={String(secondary.assignedAssetsCount)}
                hint="Assigned"
                icon={Package}
                tone="amber"
                accent="text-amber-600 dark:text-amber-400"
                iconBg="bg-amber-500/10"
                href={ASSETS_ROUTES.dashboard}
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label="Exit Clearance"
                value={String(secondary.exitClearancePending)}
                hint="Pending"
                icon={ClipboardList}
                tone="rose"
                accent="text-rose-600 dark:text-rose-400"
                iconBg="bg-rose-500/10"
                href={DASHBOARD_KPI_LINKS.exitRequests}
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label="Upcoming Birthdays"
                value={String(secondary.upcomingBirthdaysCount)}
                hint="Next 7 days"
                icon={Cake}
                tone="violet"
                accent="text-violet-600 dark:text-violet-400"
                iconBg="bg-violet-500/10"
                href={EMPLOYEE_ROUTES.list}
              />
            </div>
          </EmployeeSectionCard>
        </div>
      </div>
    </div>
  );
}
