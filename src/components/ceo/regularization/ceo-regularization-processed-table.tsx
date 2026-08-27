"use client";

import { format, parseISO } from "date-fns";
import { Eye } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  formatLeaveMonthYear,
} from "@/lib/leave/services/leave-utils";
import { cn } from "@/lib/utils";
import type { CeoRegularizationQueueItem } from "@/types/ceo-regularization";

type Props = {
  items: CeoRegularizationQueueItem[];
  month: number;
  year: number;
  isLoading?: boolean;
  onView?: (id: string) => void;
};

function formatTime(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "hh:mm a");
  } catch {
    return value;
  }
}

function statusClass(status: string) {
  if (status === "approved") {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }
  if (status === "rejected") {
    return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
  }
  return "bg-muted text-muted-foreground";
}

function statusLabel(status: string) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return status;
}

export function CeoRegularizationProcessedTable({
  items,
  month,
  year,
  isLoading,
  onView,
}: Props) {
  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-1 border-b px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Processed this month</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your approved and rejected regularization decisions for{" "}
            {formatLeaveMonthYear(month, year)}.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </div>

      <div className="max-h-[26rem] overflow-auto">
        <table className="w-full min-w-[52rem] text-sm">
          <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
            <tr>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Employee</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Date</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Requested Times</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Department</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Status</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Actions</th>
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
                  No processed regularization for this month yet.
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
                <td className="px-4 py-3 whitespace-nowrap">
                  {row.attendanceDate
                    ? format(parseISO(row.attendanceDate), "dd MMM yyyy")
                    : "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatTime(row.requestedCheckInAt)} – {formatTime(row.requestedCheckOutAt)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.departmentName ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                      statusClass(row.correctionStatus),
                    )}
                  >
                    {statusLabel(row.correctionStatus)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {onView ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="View regularization"
                      onClick={() => onView(row.id)}
                    >
                      <Eye className="size-4" />
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
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
