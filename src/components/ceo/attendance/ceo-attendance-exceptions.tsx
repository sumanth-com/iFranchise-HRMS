"use client";

import { BarRow } from "@/components/reports/report-chart-cards";
import type { CeoAttendanceExceptions } from "@/types/ceo-attendance";

function ExceptionList({
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
                    {item.meta ?? (item.value != null ? `${item.value}%` : "")}
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.meta ?? (item.value != null ? `${item.value}%` : "")}
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

export function CeoAttendanceExceptions({
  exceptions,
  onSelectEmployee,
  onSelectDepartment,
}: {
  exceptions: CeoAttendanceExceptions;
  onSelectEmployee: (employeeId: string) => void;
  onSelectDepartment: (departmentId: string) => void;
}) {
  const deptMax = Math.max(
    1,
    ...exceptions.departmentsBelowTarget.map((item) => item.value),
  );

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Exceptions</h2>
        <p className="text-xs text-muted-foreground">
          Late patterns, missing check-outs, overtime, and low attendance signals.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <ExceptionList
          title="Employees Frequently Late"
          items={exceptions.frequentlyLate}
          onSelect={onSelectEmployee}
        />

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold">
            Departments Below Attendance Target
          </h3>
          {exceptions.departmentsBelowTarget.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No departments below target.
            </p>
          ) : (
            <div className="space-y-2.5">
              {exceptions.departmentsBelowTarget.map((item) => (
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
                    formatValue={(value) => `${value}%`}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        <ExceptionList
          title="Missing Check Outs"
          items={exceptions.missingCheckOuts}
          onSelect={onSelectEmployee}
        />
        <ExceptionList
          title="Attendance Anomalies"
          items={exceptions.anomalies}
          onSelect={onSelectEmployee}
        />
        <ExceptionList
          title="High Overtime"
          items={exceptions.highOvertime}
          onSelect={onSelectEmployee}
        />
        <ExceptionList
          title="Low Attendance"
          items={exceptions.lowAttendance}
          onSelect={onSelectEmployee}
        />
      </div>
    </section>
  );
}
