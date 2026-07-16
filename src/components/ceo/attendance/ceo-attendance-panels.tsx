"use client";

import { AlertTriangle, ArrowRight, Building2, Clock } from "lucide-react";

import { BarRow } from "@/components/reports/report-chart-cards";
import { formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import type {
  CeoAttendanceDepartmentRow,
  CeoAttendanceExceptions,
  CeoAttendanceKpis,
} from "@/types/ceo-attendance";
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
    <section className="flex h-full min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm">
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

function DepartmentAttendancePanel({
  departments,
  onSelectDepartment,
}: {
  departments: CeoAttendanceDepartmentRow[];
  onSelectDepartment: (departmentId: string) => void;
}) {
  const ranked = [...departments]
    .filter((item) => item.presentPercent > 0)
    .sort((a, b) => b.presentPercent - a.presentPercent)
    .slice(0, 5);

  const fallback = departments.slice(0, 5);
  const items = ranked.length > 0 ? ranked : fallback;
  const max = Math.max(1, ...items.map((item) => item.presentPercent));

  return (
    <Panel title="By Department" subtitle="Attendance rate by team">
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
                value={item.presentPercent}
                max={max}
                color="bg-primary"
                formatValue={(value) => formatCeoPercent(value)}
              />
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}

function NeedsAttentionPanel({
  kpis,
  exceptions,
  onSelectEmployee,
}: {
  kpis: CeoAttendanceKpis;
  exceptions: CeoAttendanceExceptions;
  onSelectEmployee: (employeeId: string) => void;
}) {
  const attentionItems = [
    ...exceptions.lowAttendance,
    ...exceptions.frequentlyLate,
    ...exceptions.missingCheckOuts,
    ...exceptions.highOvertime,
  ].slice(0, 5);

  return (
    <Panel title="Needs Attention" subtitle="Employees and patterns to review">
      <div className="grid grid-cols-2 gap-2">
        <PriorityTile
          label="Late Arrivals"
          value={String(kpis.lateArrivals)}
          detail={kpis.lateArrivals > 0 ? "Late today" : "No late arrivals today"}
          icon={<Clock className="size-3.5" />}
          tone={kpis.lateArrivals > 0 ? "text-amber-700 dark:text-amber-400" : undefined}
        />
        <PriorityTile
          label="Absent Today"
          value={String(kpis.absentToday)}
          detail={kpis.absentToday > 0 ? "Unplanned absences" : "Full attendance today"}
          icon={<AlertTriangle className="size-3.5" />}
          tone={kpis.absentToday > 0 ? "text-destructive" : undefined}
        />
        <PriorityTile
          label="WFH Today"
          value={String(kpis.workFromHome)}
          detail="Remote workforce count"
          icon={<Building2 className="size-3.5" />}
        />
        <PriorityTile
          label="Overtime"
          value={`${kpis.overtimeHours.toFixed(1)} hrs`}
          detail="Company overtime this period"
          icon={<Clock className="size-3.5" />}
          tone={kpis.overtimeHours > 0 ? "text-violet-600 dark:text-violet-400" : undefined}
        />
      </div>

      {attentionItems.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Flagged Employees
          </p>
          <ul className="space-y-1.5">
            {attentionItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
                  onClick={() => onSelectEmployee(item.id)}
                >
                  <span className="min-w-0 truncate font-medium">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    {item.meta ?? ""}
                    <ArrowRight className="size-3.5" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {exceptions.departmentsBelowTarget.length > 0 ? (
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            Departments Below Target
          </p>
          <div className="space-y-1.5">
            {exceptions.departmentsBelowTarget.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{item.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatCeoPercent(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

export function CeoAttendancePanels({
  departments,
  kpis,
  exceptions,
  onSelectDepartment,
  onSelectEmployee,
}: {
  departments: CeoAttendanceDepartmentRow[];
  kpis: CeoAttendanceKpis;
  exceptions: CeoAttendanceExceptions;
  onSelectDepartment: (departmentId: string) => void;
  onSelectEmployee: (employeeId: string) => void;
}) {
  return (
    <div className="grid w-full shrink-0 gap-3 lg:grid-cols-2 lg:items-stretch">
      <DepartmentAttendancePanel
        departments={departments}
        onSelectDepartment={onSelectDepartment}
      />
      <NeedsAttentionPanel
        kpis={kpis}
        exceptions={exceptions}
        onSelectEmployee={onSelectEmployee}
      />
    </div>
  );
}
