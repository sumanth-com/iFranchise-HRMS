"use client";

import { Eye } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { formatHalfDayPeriod, formatLeaveDate } from "@/lib/leave/services/leave-utils";
import type { CeoLeaveRecord } from "@/types/ceo-leave";

export function LeavePanel({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description?: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {typeof count === "number" ? (
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
            {count}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function durationLabel(record: CeoLeaveRecord) {
  if (record.isHalfDay) {
    return `Half day${
      formatHalfDayPeriod(record.halfDayPeriod)
        ? ` · ${formatHalfDayPeriod(record.halfDayPeriod)}`
        : ""
    }`;
  }
  return `${record.totalDays} day${record.totalDays === 1 ? "" : "s"}`;
}

type TableProps = {
  records: CeoLeaveRecord[];
  isLoading?: boolean;
  onView: (id: string) => void;
};

function EmployeeCell({ record }: { record: CeoLeaveRecord }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{record.employeeName}</p>
      <p className="truncate text-xs text-muted-foreground">
        {record.departmentName ?? record.employeeCode}
      </p>
    </div>
  );
}

function ViewButton({ id, onView }: { id: string; onView: (id: string) => void }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="View details"
      onClick={() => onView(id)}
    >
      <Eye className="size-4" />
    </Button>
  );
}

export function CeoTodaysLeaveTable({ records, isLoading, onView }: TableProps) {
  const columns: DataTableColumn<CeoLeaveRecord>[] = [
    {
      key: "employeeName",
      header: "Employee",
      render: (row) => <EmployeeCell record={row} />,
    },
    {
      key: "leaveTypeName",
      header: "Leave Type",
      render: (row) => row.leaveTypeName || "—",
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          {durationLabel(row)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => <ViewButton id={row.id} onView={onView} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={records}
      emptyMessage={isLoading ? "Loading…" : "No employees are on leave today."}
    />
  );
}

export function CeoUpcomingLeaveTable({ records, isLoading, onView }: TableProps) {
  const columns: DataTableColumn<CeoLeaveRecord>[] = [
    {
      key: "employeeName",
      header: "Employee",
      render: (row) => <EmployeeCell record={row} />,
    },
    {
      key: "leaveTypeName",
      header: "Leave Type",
      render: (row) => row.leaveTypeName || "—",
    },
    {
      key: "dates",
      header: "Dates",
      render: (row) => (
        <div className="min-w-0">
          <p className="whitespace-nowrap text-sm">
            {row.startDate === row.endDate
              ? formatLeaveDate(row.startDate)
              : `${formatLeaveDate(row.startDate)} – ${formatLeaveDate(row.endDate)}`}
          </p>
          <p className="text-xs text-muted-foreground">{durationLabel(row)}</p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => <ViewButton id={row.id} onView={onView} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={records}
      emptyMessage={isLoading ? "Loading…" : "No upcoming leaves in the selected range."}
    />
  );
}
