"use client";

import {
  AlertTriangle,
  ArrowRight,
  Target,
  TrendingUp,
  UserCheck,
} from "lucide-react";

import { BarRow } from "@/components/reports/report-chart-cards";
import { formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import type {
  CeoPerformanceDepartmentRow,
  CeoPerformanceKpis,
  CeoPerformanceLowPerformance,
  CeoPerformanceOverview,
  CeoPerformancePromotionOverview,
} from "@/types/ceo-performance";
import { cn } from "@/lib/utils";

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 shrink-0">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function PriorityTile({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="flex h-full min-h-[5.5rem] flex-col justify-between rounded-lg border bg-background/80 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
          {icon}
        </span>
        <p className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</p>
      </div>
      <div className="mt-2">
        <p className="text-xs font-medium">{label}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function DepartmentSnapshot({
  departments,
  onSelectDepartment,
}: {
  departments: CeoPerformanceDepartmentRow[];
  onSelectDepartment: (departmentId: string) => void;
}) {
  const ranked = [...departments]
    .filter((item) => item.averageRating != null && item.averageRating > 0)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0))
    .slice(0, 5);

  const fallback = departments.slice(0, 5);
  const items = ranked.length > 0 ? ranked : fallback;
  const max = Math.max(
    1,
    ...items.map((item) => item.averageRating ?? item.goalCompletionPercent ?? 0),
  );

  return (
    <Panel title="By Department" subtitle="Ratings and goal completion">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No department data yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className="w-full text-left"
              onClick={() => onSelectDepartment(item.id)}
            >
              <BarRow
                label={item.name}
                value={item.averageRating ?? item.goalCompletionPercent}
                max={max}
                color="bg-primary"
                formatValue={(value) =>
                  item.averageRating != null ? value.toFixed(1) : formatCeoPercent(value)
                }
              />
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AttentionPanel({
  kpis,
  overview,
  lowPerformance,
  promotions,
  onSelectEmployee,
}: {
  kpis: CeoPerformanceKpis;
  overview: CeoPerformanceOverview;
  lowPerformance: CeoPerformanceLowPerformance;
  promotions: CeoPerformancePromotionOverview;
  onSelectEmployee: (employeeId: string) => void;
}) {
  const belowTarget = lowPerformance.departmentsBelowTarget.length;
  const pipCount = lowPerformance.employeesOnPip.length;

  return (
    <Panel title="Needs Attention" subtitle="What to review first">
      <div className="grid grid-cols-2 gap-2">
        <PriorityTile
          label="Pending Reviews"
          value={String(kpis.pendingReviews)}
          detail={
            kpis.pendingReviews > 0 ? "Reviews still incomplete" : "No review backlog"
          }
          icon={<Target className="size-3.5" />}
          tone={
            kpis.pendingReviews > 0 ? "text-amber-700 dark:text-amber-400" : undefined
          }
        />
        <PriorityTile
          label="On PIP"
          value={String(pipCount || kpis.employeesOnPip)}
          detail={pipCount > 0 ? "Employees need support" : "No active PIP cases"}
          icon={<AlertTriangle className="size-3.5" />}
          tone={pipCount > 0 || kpis.employeesOnPip > 0 ? "text-destructive" : undefined}
        />
        <PriorityTile
          label="Promotions"
          value={String(promotions.pending)}
          detail={`${promotions.recommendations} recommended`}
          icon={<TrendingUp className="size-3.5" />}
          tone={
            promotions.pending > 0 ? "text-violet-600 dark:text-violet-400" : undefined
          }
        />
        <PriorityTile
          label="Goal Completion"
          value={formatCeoPercent(overview.goalCompletionPercentage)}
          detail={
            belowTarget > 0
              ? `${belowTarget} dept${belowTarget === 1 ? "" : "s"} below target`
              : "Company-wide progress"
          }
          icon={<UserCheck className="size-3.5" />}
        />
      </div>

      {lowPerformance.pendingReviews.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Pending Review Owners
          </p>
          <ul className="space-y-1.5">
            {lowPerformance.pendingReviews.slice(0, 4).map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
                  onClick={() => onSelectEmployee(item.id)}
                >
                  <span className="truncate font-medium">{item.label}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Panel>
  );
}

export function CeoPerformancePanels({
  departments,
  kpis,
  overview,
  lowPerformance,
  promotions,
  onSelectDepartment,
  onSelectEmployee,
}: {
  departments: CeoPerformanceDepartmentRow[];
  kpis: CeoPerformanceKpis;
  overview: CeoPerformanceOverview;
  lowPerformance: CeoPerformanceLowPerformance;
  promotions: CeoPerformancePromotionOverview;
  onSelectDepartment: (departmentId: string) => void;
  onSelectEmployee: (employeeId: string) => void;
}) {
  return (
    <div className="grid w-full shrink-0 gap-3 lg:grid-cols-2 lg:items-stretch">
      <DepartmentSnapshot
        departments={departments}
        onSelectDepartment={onSelectDepartment}
      />
      <AttentionPanel
        kpis={kpis}
        overview={overview}
        lowPerformance={lowPerformance}
        promotions={promotions}
        onSelectEmployee={onSelectEmployee}
      />
    </div>
  );
}
