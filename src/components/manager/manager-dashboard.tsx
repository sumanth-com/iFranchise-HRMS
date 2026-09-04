"use client";

import { useMemo } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  Clock3,
  Palmtree,
  Sparkles,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";

import { ErrorState } from "@/components/common";
import {
  EmployeeSectionCard,
  EmployeeStatCard,
} from "@/components/employee/dashboard/employee-module-primitives";
import { MANAGER_DASHBOARD_KPI_LINKS, MANAGER_ROUTES } from "@/lib/manager/constants";
import type { ManagerDashboardData } from "@/types/manager-dashboard";

type ManagerDashboardProps = {
  data: ManagerDashboardData;
  error?: string | null;
};

const MANAGER_FOCUS_IDS = new Set([
  "interviews-today",
  "leave-approvals",
  "offers-pending",
]);

export function ManagerDashboard({ data, error }: ManagerDashboardProps) {
  const focusById = useMemo(() => {
    const map = new Map<string, (typeof data.tasks)[number]>();
    for (const task of data.tasks) {
      if (MANAGER_FOCUS_IDS.has(task.id)) {
        map.set(task.id, task);
      }
    }
    return map;
  }, [data.tasks]);

  const interviewsTask = focusById.get("interviews-today");
  const leaveApprovalsTask = focusById.get("leave-approvals");
  const recruitmentTask = focusById.get("offers-pending");

  if (error) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 md:p-5">
        <ErrorState title="Unable to load manager overview" description={error} />
      </div>
    );
  }

  const { todayPulse, kpis } = data;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-4">
      <div className="mx-auto flex w-full min-w-0 max-w-[88rem] flex-1 min-h-0 flex-col gap-3">
        <EmployeeSectionCard
          compact
          title="Today's Pulse"
          description="Live snapshot of your team today"
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
              href={MANAGER_DASHBOARD_KPI_LINKS.presentToday}
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
              href={MANAGER_DASHBOARD_KPI_LINKS.onLeaveToday}
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
              href={MANAGER_DASHBOARD_KPI_LINKS.lateToday}
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
              href={MANAGER_DASHBOARD_KPI_LINKS.pendingLeaveApprovals}
            />
          </div>
        </EmployeeSectionCard>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <EmployeeSectionCard
            compact
            title="Focus Today"
            description="Interviews, leave approvals, and open recruitment"
            className="flex min-h-0 flex-1 flex-col p-3.5 md:p-4"
            bodyClassName="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3 sm:items-stretch">
              <EmployeeStatCard
                tall
                showWave={false}
                label="Interviews Today"
                value={String(interviewsTask?.count ?? 0)}
                hint="Scheduled"
                icon={CalendarClock}
                tone="sky"
                accent="text-sky-600 dark:text-sky-400"
                iconBg="bg-sky-500/10"
                href={interviewsTask?.href ?? MANAGER_ROUTES.recruitmentInterviews}
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label="Leave Approvals"
                value={String(leaveApprovalsTask?.count ?? kpis.pendingLeaveApprovals)}
                hint="Pending"
                icon={Palmtree}
                tone="violet"
                accent="text-violet-600 dark:text-violet-400"
                iconBg="bg-violet-500/10"
                href={
                  leaveApprovalsTask?.href ?? MANAGER_DASHBOARD_KPI_LINKS.pendingLeaveApprovals
                }
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label="Open Recruitment Requests"
                value={String(recruitmentTask?.count ?? kpis.openRecruitmentRequests)}
                hint="Open roles"
                icon={BriefcaseBusiness}
                tone="amber"
                accent="text-amber-600 dark:text-amber-400"
                iconBg="bg-amber-500/10"
                href={
                  recruitmentTask?.href ?? MANAGER_DASHBOARD_KPI_LINKS.openRecruitmentRequests
                }
              />
            </div>
          </EmployeeSectionCard>

          <EmployeeSectionCard
            compact
            title="Team Insights"
            description="Attendance, performance, and team size at a glance"
            className="flex min-h-0 flex-1 flex-col p-3.5 md:p-4"
            bodyClassName="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3 sm:items-stretch">
              <EmployeeStatCard
                tall
                showWave={false}
                label="Team Attendance Report"
                value={`${todayPulse.presentToday}/${kpis.teamSize}`}
                hint="Present today"
                icon={BarChart3}
                tone="emerald"
                accent="text-emerald-600 dark:text-emerald-400"
                iconBg="bg-emerald-500/10"
                href={MANAGER_ROUTES.reportsAttendance}
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label="Performance Reviews Due"
                value={String(kpis.pendingPerformanceReviews)}
                hint="Needs follow-up"
                icon={ClipboardList}
                tone="rose"
                accent="text-rose-600 dark:text-rose-400"
                iconBg="bg-rose-500/10"
                href={MANAGER_DASHBOARD_KPI_LINKS.pendingPerformanceReviews}
              />
              <EmployeeStatCard
                tall
                showWave={false}
                label="Team Members"
                value={String(kpis.teamSize)}
                hint="People"
                icon={Users}
                tone="sky"
                accent="text-sky-600 dark:text-sky-400"
                iconBg="bg-sky-500/10"
                href={MANAGER_DASHBOARD_KPI_LINKS.teamSize}
              />
            </div>
          </EmployeeSectionCard>
        </div>
      </div>
    </div>
  );
}
