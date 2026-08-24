"use client";

import { format, parseISO } from "date-fns";
import { Eye } from "lucide-react";

import { Button } from "@/components/common/button";
import { LEAVE_STATUS_LABELS } from "@/lib/leave/constants";
import {
  formatHalfDayPeriod,
  formatLeaveMonthYear,
} from "@/lib/leave/services/leave-utils";
import { cn } from "@/lib/utils";
import type { CeoLeaveRecord } from "@/types/ceo-leave";
import type { LeaveStatus } from "@/types/leave";

type CeoLeaveProcessedTableProps = {
  items: CeoLeaveRecord[];
  month: number;
  year: number;
  isLoading?: boolean;
  onView: (id: string) => void;
};

function durationLabel(item: CeoLeaveRecord) {
  if (item.isHalfDay) {
    return `Half day${
      formatHalfDayPeriod(item.halfDayPeriod)
        ? ` · ${formatHalfDayPeriod(item.halfDayPeriod)}`
        : ""
    }`;
  }
  return `${item.totalDays} day${item.totalDays === 1 ? "" : "s"}`;
}

function dateRangeLabel(item: CeoLeaveRecord) {
  if (item.startDate === item.endDate) {
    return format(parseISO(item.startDate), "dd MMM yyyy");
  }
  return `${format(parseISO(item.startDate), "dd MMM yyyy")} – ${format(parseISO(item.endDate), "dd MMM yyyy")}`;
}

function statusClass(status: LeaveStatus) {
  if (status === "approved") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "rejected") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "bg-muted text-muted-foreground";
}

export function CeoLeaveProcessedTable({
  items,
  month,
  year,
  isLoading,
  onView,
}: CeoLeaveProcessedTableProps) {
  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-1 border-b px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Processed this month</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your approved and rejected decisions for {formatLeaveMonthYear(month, year)}.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </div>

      <div className="max-h-[26rem] overflow-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="sticky top-0 z-30 bg-black text-left shadow-[0_1px_0_rgba(255,255,255,0.08)]">
            <tr>
              <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Employee</th>
              <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Leave</th>
              <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Dates</th>
              <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Department</th>
              <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Status</th>
              <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : null}

            {!isLoading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No processed leave for this month yet. Approved and rejected requests will
                  appear here.
                </td>
              </tr>
            ) : null}

            {items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.employeeName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.employeeCode}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate">{row.leaveTypeName || "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {durationLabel(row)}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{dateRangeLabel(row)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.departmentName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      statusClass(row.leaveStatus),
                    )}
                  >
                    {LEAVE_STATUS_LABELS[row.leaveStatus] ?? row.leaveStatus}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label="View leave details"
                    onClick={() => onView(row.id)}
                  >
                    <Eye className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t px-5 py-3 text-sm text-muted-foreground">
        Showing {items.length} decision{items.length === 1 ? "" : "s"} for{" "}
        {formatLeaveMonthYear(month, year)}.
      </div>
    </section>
  );
}
