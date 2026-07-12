import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";

import { EmptyState } from "@/components/common/empty-state";
import { BarRow } from "@/components/reports/report-chart-cards";
import type {
  DashboardActivityItem,
  DashboardChartItem,
  DashboardListItem,
  DashboardPersonEvent,
  DashboardTaskItem,
  HrDashboardData,
} from "@/types/dashboard";
import { DASHBOARD_QUICK_ACCESS } from "@/lib/dashboard/constants";
import { hasPermission } from "@/lib/permissions/utils";
import { cn } from "@/lib/utils";

function seriesMax(items: DashboardChartItem[]) {
  return Math.max(1, ...items.map((item) => item.value));
}

function Panel({
  title,
  children,
  className,
  actionHref,
  actionLabel,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className={cn("flex min-h-0 flex-col rounded-xl border bg-card p-3 shadow-sm", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-foreground uppercase">
          {title}
        </h2>
        {actionHref && actionLabel ? (
          <Link href={actionHref} className="text-[11px] text-primary hover:underline">
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function ChartBlock({
  title,
  items,
  color,
}: {
  title: string;
  items: DashboardChartItem[];
  color?: string;
}) {
  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 6).map((item) => (
            <BarRow
              key={item.label}
              label={item.label}
              value={item.value}
              max={seriesMax(items)}
              color={color}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function ListBlock({
  title,
  items,
  empty,
  actionHref,
}: {
  title: string;
  items: DashboardListItem[];
  empty: string;
  actionHref?: string;
}) {
  return (
    <Panel title={title} actionHref={actionHref} actionLabel={actionHref ? "View all" : undefined}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="flex items-start justify-between gap-2 py-1.5 text-xs hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.primary}</p>
                  <p className="truncate text-muted-foreground">{item.secondary}</p>
                </div>
                <span className="shrink-0 text-[10px] text-muted-foreground">{item.meta}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function PersonEvents({
  title,
  items,
  empty,
}: {
  title: string;
  items: DashboardPersonEvent[];
  empty: string;
}) {
  return (
    <Panel title={title}>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={item.href} className="flex items-center justify-between gap-2 text-xs hover:underline">
                <span className="truncate font-medium">{item.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {item.date.slice(5)} · {item.subtitle}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Timeline({ items }: { items: DashboardActivityItem[] }) {
  return (
    <Panel title="Recent Activities">
      {items.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="Operational events will appear here as teams work."
          className="border-0 bg-transparent p-2 shadow-none"
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const content = (
              <div className="min-w-0">
                <p className="truncate text-xs font-medium capitalize">{item.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{item.description}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatDistanceToNow(parseISO(item.occurredAt), { addSuffix: true })}
                </p>
              </div>
            );
            return (
              <li key={item.id} className="flex gap-2">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                {item.href ? (
                  <Link href={item.href} className="min-w-0 flex-1 hover:opacity-80">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function Tasks({ items }: { items: DashboardTaskItem[] }) {
  return (
    <Panel title="Today's Tasks">
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">You&apos;re all caught up.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/50",
                  item.urgency === "high" && "border-destructive/30",
                  item.urgency === "medium" && "border-amber-500/30",
                )}
              >
                <span className="truncate font-medium">{item.label}</span>
                {item.count != null ? (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function DashboardChartsGrid({ charts }: { charts: HrDashboardData["charts"] }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      <ChartBlock title="Headcount by Department" items={charts.headcountByDepartment} />
      <ChartBlock
        title="Attendance Trend (7 Days)"
        items={charts.attendanceTrend7Days}
        color="bg-blue-500"
      />
      <ChartBlock
        title="Monthly Hiring"
        items={charts.monthlyHiring}
        color="bg-emerald-500"
      />
      <ChartBlock
        title="Monthly Attrition"
        items={charts.monthlyAttrition}
        color="bg-destructive/80"
      />
      <ChartBlock
        title="Leave Distribution"
        items={charts.leaveDistribution}
        color="bg-violet-500"
      />
      <ChartBlock
        title="Gender Distribution"
        items={charts.genderDistribution}
        color="bg-sky-500"
      />
      <ChartBlock
        title="Employment Type"
        items={charts.employmentTypeDistribution}
        color="bg-amber-500"
      />
    </div>
  );
}

export function DashboardMiddleRow({
  activities,
  tasks,
}: {
  activities: DashboardActivityItem[];
  tasks: DashboardTaskItem[];
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr]">
      <Timeline items={activities} />
      <Tasks items={tasks} />
    </div>
  );
}

export function DashboardQuickAccess({ permissionCodes }: { permissionCodes: string[] }) {
  const items = DASHBOARD_QUICK_ACCESS.filter((item) =>
    hasPermission(permissionCodes, item.permission),
  );

  if (items.length === 0) return null;

  return (
    <Panel title="Quick Access">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border px-3 py-2 transition-colors hover:border-primary/40 hover:bg-accent/30"
          >
            <p className="text-xs font-semibold">{item.title}</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{item.description}</p>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

export function DashboardEventsRow({
  birthdays,
  anniversaries,
  interviews,
  holidays,
}: {
  birthdays: DashboardPersonEvent[];
  anniversaries: DashboardPersonEvent[];
  interviews: DashboardListItem[];
  holidays: DashboardListItem[];
}) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      <PersonEvents title="Upcoming Birthdays" items={birthdays} empty="No birthdays in 30 days." />
      <PersonEvents
        title="Work Anniversaries"
        items={anniversaries}
        empty="No anniversaries in 30 days."
      />
      <ListBlock
        title="Upcoming Interviews"
        items={interviews}
        empty="No interviews scheduled."
      />
      <ListBlock title="Upcoming Holidays" items={holidays} empty="No holidays in 30 days." />
    </div>
  );
}

export function DashboardBottomLists({ data }: { data: HrDashboardData }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
      <ListBlock
        title="Recent Employees"
        items={data.recentEmployees}
        empty="No employees yet."
        actionHref="/dashboard/employees"
      />
      <ListBlock
        title="Latest Leave Requests"
        items={data.recentLeaveRequests}
        empty="No leave requests."
        actionHref="/dashboard/leave"
      />
      <ListBlock
        title="Recruitment Activity"
        items={data.recentRecruitment}
        empty="No recruitment activity."
        actionHref="/dashboard/recruitment/jobs"
      />
      <ListBlock
        title="Recent Payroll Runs"
        items={data.recentPayrollRuns}
        empty="No payroll runs yet."
        actionHref="/dashboard/payroll"
      />
    </div>
  );
}
