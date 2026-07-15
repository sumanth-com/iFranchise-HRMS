"use client";

import { BarRow } from "@/components/reports/report-chart-cards";
import type { CeoPerformanceLowPerformance } from "@/types/ceo-performance";

function AttentionList({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: { id: string; label: string; meta?: string; value?: number }[];
  onSelect?: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No items in this category.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={`${title}-${item.id}`}>
              {onSelect ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted/40"
                  onClick={() => onSelect(item.id)}
                >
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.meta ?? (item.value != null ? String(item.value) : "")}
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.meta ?? (item.value != null ? String(item.value) : "")}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CeoPerformanceLowPerformance({
  data,
  onSelectEmployee,
  onSelectDepartment,
}: {
  data: CeoPerformanceLowPerformance;
  onSelectEmployee: (employeeId: string) => void;
  onSelectDepartment: (departmentId: string) => void;
}) {
  const deptMax = Math.max(1, ...data.departmentsBelowTarget.map((item) => item.value));

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Low Performance</h2>
        <p className="text-xs text-muted-foreground">
          PIP cases, below-target departments, delays, and managers needing attention.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <AttentionList
          title="Employees on PIP"
          items={data.employeesOnPip}
          onSelect={onSelectEmployee}
        />

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">Departments Below Target</h3>
          {data.departmentsBelowTarget.length === 0 ? (
            <p className="text-sm text-muted-foreground">No departments below target.</p>
          ) : (
            <div className="space-y-2.5">
              {data.departmentsBelowTarget.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelectDepartment(item.id)}
                >
                  <BarRow
                    label={item.label}
                    value={item.value}
                    max={deptMax}
                    color="bg-rose-500"
                    formatValue={(value) => value.toFixed(1)}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <AttentionList
          title="Managers Requiring Attention"
          items={data.managersRequiringAttention}
        />
        <AttentionList
          title="Pending Reviews"
          items={data.pendingReviews}
          onSelect={onSelectEmployee}
        />
        <AttentionList
          title="Review Delays"
          items={data.reviewDelays}
          onSelect={onSelectEmployee}
        />
      </div>
    </section>
  );
}
