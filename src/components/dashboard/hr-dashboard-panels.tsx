"use client";

import { format } from "date-fns";
import Link from "next/link";

import {
  DashboardEmpty,
  DashboardMetricCard,
  DashboardPanel,
} from "@/components/dashboard/dashboard-primitives";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BarRow, ChartCard } from "@/components/reports/report-chart-cards";
import {
  KPI_LINKS,
  QUICK_ACCESS_ITEMS,
  SECONDARY_LINKS,
} from "@/lib/dashboard/constants";
import { formatCurrencyInr } from "@/lib/reports/services/reports-utils";
import { cn } from "@/lib/utils";
import type { HrDashboardData } from "@/types/dashboard";
import type { ChartSeriesItem } from "@/types/reports";

function seriesMax(items: ChartSeriesItem[]) {
  return Math.max(1, ...items.map((item) => item.value));
}

function MiniChart({
  title,
  items,
  color = "bg-primary",
  formatValue,
}: {
  title: string;
  items: ChartSeriesItem[];
  color?: string;
  formatValue?: (value: number) => string;
}) {
  return (
    <ChartCard title={title} subtitle="">
      {items.length === 0 ? (
        <DashboardEmpty message="No data yet." />
      ) : (
        items.slice(0, 6).map((item) => (
          <BarRow
            key={item.label}
            label={item.label}
            value={item.value}
            max={seriesMax(items)}
            color={color}
            formatValue={formatValue}
          />
        ))
      )}
    </ChartCard>
  );
}

const EVENT_ICONS: Record<string, string> = {
  birthday: "🎂",
  anniversary: "🏆",
  interview: "💼",
  holiday: "📅",
};

type HrDashboardPanelsProps = {
  data: HrDashboardData;
};

export function HrDashboardPanels({ data }: HrDashboardPanelsProps) {
  const { permissions, kpis, secondary, charts } = data;
  const quickAccess = QUICK_ACCESS_ITEMS.filter((item) => permissions[item.permission]);

  const primaryKpis = [
    { key: "totalEmployees", label: "Total Employees", value: kpis.totalEmployees, show: permissions.employees || permissions.attendance },
    { key: "presentToday", label: "Present Today", value: kpis.presentToday, show: permissions.attendance },
    { key: "onLeaveToday", label: "On Leave Today", value: kpis.onLeaveToday, show: permissions.leave || permissions.attendance },
    { key: "absentToday", label: "Absent Today", value: kpis.absentToday, show: permissions.attendance },
    { key: "lateToday", label: "Late Today", value: kpis.lateToday, show: permissions.attendance },
    { key: "newJoinersThisMonth", label: "New Joiners", value: kpis.newJoinersThisMonth, show: permissions.employees },
    { key: "employeesExiting", label: "Exiting", value: kpis.employeesExiting, show: permissions.exit || permissions.employees },
    { key: "openRecruitments", label: "Open Recruitments", value: kpis.openRecruitments, show: permissions.recruitment },
    { key: "pendingApprovals", label: "Pending Approvals", value: kpis.pendingApprovals, show: permissions.leave || permissions.performance || permissions.exit },
  ].filter((k) => k.show);

  const secondaryMetrics = [
    { key: "attendancePercent", label: "Attendance %", value: `${secondary.attendancePercent}%`, show: permissions.attendance },
    { key: "leaveUtilizationPercent", label: "Leave %", value: `${secondary.leaveUtilizationPercent}%`, show: permissions.leave },
    { key: "payrollStatus", label: "Payroll Status", value: secondary.payrollStatus ?? "—", show: permissions.payroll },
    { key: "upcomingBirthdays", label: "Birthdays", value: secondary.upcomingBirthdays, show: permissions.employees },
    { key: "upcomingAnniversaries", label: "Anniversaries", value: secondary.upcomingAnniversaries, show: permissions.employees },
    { key: "probationEndingSoon", label: "Probation Ending", value: secondary.probationEndingSoon, show: permissions.employees },
    { key: "documentsExpiring", label: "Docs Expiring", value: secondary.documentsExpiring, show: permissions.documents },
    { key: "assetsPendingReturn", label: "Assets Pending", value: secondary.assetsPendingReturn, show: permissions.exit || permissions.assets },
  ].filter((m) => m.show);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-3 md:p-4">
      <DashboardHeader userName={data.userName} permissions={permissions} />

      {primaryKpis.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
          {primaryKpis.map((kpi) => (
            <DashboardMetricCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              href={KPI_LINKS[kpi.key as keyof typeof KPI_LINKS]}
              compact
            />
          ))}
        </div>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
        <div className="flex min-w-0 flex-col gap-3">
          {secondaryMetrics.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {secondaryMetrics.map((metric) => (
                <DashboardMetricCard
                  key={metric.key}
                  label={metric.label}
                  value={metric.value}
                  href={SECONDARY_LINKS[metric.key as keyof typeof SECONDARY_LINKS]}
                  compact
                />
              ))}
            </div>
          ) : null}

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <DashboardPanel
              title="Recent Activities"
              subtitle="Latest HR operations"
              href={permissions.audit ? "/dashboard/audit/timeline" : undefined}
              compact
            >
              {data.activities.length === 0 ? (
                <DashboardEmpty message="No recent activity recorded." />
              ) : (
                <ul className="space-y-2">
                  {data.activities.slice(0, 6).map((item) => (
                    <li key={item.id}>
                      <Link href={item.href} className="block rounded-md px-1 py-1 hover:bg-accent/50">
                        <p className="truncate text-xs font-medium">{item.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {item.subtitle} · {format(new Date(item.occurredAt), "MMM d, h:mm a")}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </DashboardPanel>

            {quickAccess.length > 0 ? (
              <DashboardPanel title="Quick Access" compact>
                <div className="grid grid-cols-2 gap-2">
                  {quickAccess.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-xs font-medium transition-colors hover:border-primary/30 hover:bg-accent/40"
                      >
                        <Icon className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </DashboardPanel>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            <MiniChart title="Headcount by Dept" items={charts.headcountByDepartment} color="bg-teal-500" />
            <MiniChart title="Attendance (7 Days)" items={charts.attendanceTrend7Day} color="bg-blue-500" />
            <MiniChart title="Monthly Hiring" items={charts.monthlyHiring} color="bg-emerald-500" />
            <MiniChart title="Monthly Attrition" items={charts.monthlyAttrition} color="bg-destructive/80" />
            <MiniChart title="Leave Distribution" items={charts.leaveDistribution} color="bg-violet-500" />
            <MiniChart title="Gender Distribution" items={charts.genderDistribution} color="bg-indigo-500" />
            <MiniChart title="Employment Type" items={charts.employmentTypeDistribution} color="bg-amber-500" />
          </div>

          <DashboardPanel title="Upcoming Events" compact>
            {data.upcomingEvents.length === 0 ? (
              <DashboardEmpty message="No upcoming events in the next 30 days." />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {data.upcomingEvents.slice(0, 8).map((event) => (
                  <Link
                    key={event.id}
                    href={event.href}
                    className="flex items-start gap-2 rounded-md border bg-background px-2.5 py-2 hover:bg-accent/40"
                  >
                    <span className="text-sm">{EVENT_ICONS[event.type] ?? "•"}</span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{event.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {format(new Date(event.date), "MMM d")}
                        {event.subtitle ? ` · ${event.subtitle}` : ""}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </DashboardPanel>

          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-4">
            <RecentTable
              title="Recent Employees"
              href={permissions.employees ? "/dashboard/employees" : undefined}
              empty="No employees yet."
              rows={data.recentEmployees.map((e) => ({
                id: e.id,
                primary: e.name,
                secondary: `${e.employeeCode} · ${e.department}`,
                meta: e.joinedAt ? format(new Date(e.joinedAt), "MMM d") : "—",
                href: e.href,
              }))}
            />
            <RecentTable
              title="Latest Leave Requests"
              href={permissions.leave ? "/dashboard/leave" : undefined}
              empty="No leave requests."
              rows={data.recentLeaveRequests.map((r) => ({
                id: r.id,
                primary: r.employeeName,
                secondary: `${r.leaveType} · ${r.days}d`,
                meta: r.status,
                href: r.href,
              }))}
            />
            <RecentTable
              title="Recruitment Activity"
              href={permissions.recruitment ? "/dashboard/recruitment" : undefined}
              empty="No recruitment activity."
              rows={data.recentRecruitment.map((r) => ({
                id: r.id,
                primary: r.title,
                secondary: r.candidateName,
                meta: format(new Date(r.createdAt), "MMM d"),
                href: r.href,
              }))}
            />
            <RecentTable
              title="Recent Payroll Runs"
              href={permissions.payroll ? "/dashboard/payroll/history" : undefined}
              empty="No payroll runs."
              rows={data.recentPayrollRuns.map((r) => ({
                id: r.id,
                primary: r.month,
                secondary: formatCurrencyInr(r.net),
                meta: r.status,
                href: r.href,
              }))}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <DashboardPanel title="Today's Tasks" subtitle="Action items" compact className="xl:sticky xl:top-0">
            {data.tasks.length === 0 ? (
              <DashboardEmpty message="No pending tasks for today." />
            ) : (
              <ul className="space-y-2">
                {data.tasks.map((task) => (
                  <li key={task.id}>
                    <Link
                      href={task.href}
                      className={cn(
                        "block rounded-md border px-2.5 py-2 transition-colors hover:bg-accent/40",
                        task.priority === "critical" && "border-destructive/40",
                        task.priority === "high" && "border-amber-500/40",
                      )}
                    >
                      <p className="text-xs font-medium">{task.title}</p>
                      {task.subtitle ? (
                        <p className="text-[10px] text-muted-foreground">{task.subtitle}</p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DashboardPanel>
        </aside>
      </div>
    </div>
  );
}

function RecentTable({
  title,
  href,
  empty,
  rows,
}: {
  title: string;
  href?: string;
  empty: string;
  rows: { id: string; primary: string; secondary: string; meta: string; href: string }[];
}) {
  return (
    <DashboardPanel title={title} href={href} compact>
      {rows.length === 0 ? (
        <DashboardEmpty message={empty} />
      ) : (
        <ul className="space-y-1.5">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={row.href} className="flex items-center justify-between gap-2 rounded px-1 py-1 hover:bg-accent/50">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{row.primary}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{row.secondary}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{row.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  );
}
