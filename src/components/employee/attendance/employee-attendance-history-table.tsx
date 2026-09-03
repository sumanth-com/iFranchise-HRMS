"use client";

import { format, parseISO } from "date-fns";
import { Check, Eye, FilePlus2, RefreshCw } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AttendanceHistoryStatusCell } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { EmployeeRegularizationDialog } from "@/components/employee/attendance/employee-regularization-dialog";
import {
  DEFAULT_ATTENDANCE_RULES,
  formatAttendanceTime,
} from "@/lib/attendance/services/attendance-utils";
import { getHrmsYears } from "@/lib/date/hrms-year";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/attendance/constants";
import { selfAttendanceUpdateCheckoutAction } from "@/lib/attendance/actions/self-attendance-punch-actions";
import { formatHoursLabel, formatLateByLabel } from "@/lib/employee/attendance-format";
import type { AttendanceStatus } from "@/types/attendance";
import type {
  ManagerAttendanceHistoryResult,
  ManagerAttendanceHistoryRow,
} from "@/types/manager-self-attendance";
import { cn } from "@/lib/utils";

type Props = {
  history: ManagerAttendanceHistoryResult;
  month: number;
  year: number;
  status?: AttendanceStatus;
  searchDate?: string;
  onFilterChange: (filters: {
    month: number;
    year: number;
    status?: AttendanceStatus;
    searchDate?: string;
    page: number;
  }) => void;
};

const STATUS_OPTIONS: AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "on_leave",
  "holiday",
  "week_off",
];

export function EmployeeAttendanceHistoryTable({
  history,
  month,
  year,
  status,
  searchDate,
  onFilterChange,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedRow, setSelectedRow] =
    useState<ManagerAttendanceHistoryRow | null>(null);
  const [regularizeRow, setRegularizeRow] =
    useState<ManagerAttendanceHistoryRow | null>(null);

  const yearOptions = useMemo(() => getHrmsYears(), []);

  function updateCheckout(row: ManagerAttendanceHistoryRow) {
    startTransition(async () => {
      const result = await selfAttendanceUpdateCheckoutAction({
        attendanceId: row.id ?? undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Checkout updated");
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Attendance History
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(year, month - 1, 1), "MMMM yyyy")} — all days with
            monthly summary and regularization requests.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(month)}
            onValueChange={(value) => {
              if (!value) return;
              onFilterChange({
                month: Number.parseInt(value, 10),
                year,
                status,
                searchDate,
                page: 1,
              });
            }}
          >
            <SelectTrigger className="h-9 w-[8rem]">
              <SelectValue placeholder="Month">
                {(value) =>
                  value
                    ? format(
                        new Date(year, Number.parseInt(String(value), 10) - 1, 1),
                        "MMMM",
                      )
                    : "Month"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, index) => (
                <SelectItem key={index + 1} value={String(index + 1)}>
                  {format(new Date(2026, index, 1), "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(year)}
            onValueChange={(value) => {
              if (!value) return;
              onFilterChange({
                month,
                year: Number.parseInt(value, 10),
                status,
                searchDate,
                page: 1,
              });
            }}
          >
            <SelectTrigger className="h-9 w-[6rem]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={status ?? "all"}
            onValueChange={(value) => {
              if (!value) return;
              onFilterChange({
                month,
                year,
                status:
                  value === "all" ? undefined : (value as AttendanceStatus),
                searchDate,
                page: 1,
              });
            }}
          >
            <SelectTrigger className="h-9 w-[9rem]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {ATTENDANCE_STATUS_LABELS[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-h-[26rem] overflow-auto">
        <table className="w-full min-w-[64rem] text-sm">
          <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
            <tr>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Date</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Status</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Check In</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Check Out</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Working Hours</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Late</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Remarks</th>
              <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.data.map((row) => (
              <tr key={row.attendanceDate} className="border-t">
                <td className="px-4 py-3 whitespace-nowrap">
                  {format(parseISO(row.attendanceDate), "dd MMM yyyy")}
                </td>
                <td className="px-4 py-3">
                  <AttendanceHistoryStatusCell status={row.attendanceStatus} />
                </td>
                <td className="px-4 py-3">
                  {formatAttendanceTime(row.checkInAt)}
                </td>
                <td className="px-4 py-3">
                  {formatAttendanceTime(row.checkOutAt)}
                </td>
                <td className="px-4 py-3">
                  {row.workHours > 0 ? formatHoursLabel(row.workHours) : "—"}
                </td>
                <td className="px-4 py-3">
                  {row.lateMinutes > 0 ? formatLateByLabel(row.lateMinutes) : "—"}
                </td>
                <td className="max-w-[12rem] truncate px-4 py-3 text-muted-foreground">
                  {row.remarks ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label="View attendance"
                      onClick={() => setSelectedRow(row)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    {row.canRequestRegularization ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Request regularization"
                        onClick={() => setRegularizeRow(row)}
                      >
                        <FilePlus2 className="size-4" />
                      </Button>
                    ) : null}
                    {row.canUpdateCheckout ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Update checkout"
                        disabled={isPending}
                        onClick={() => updateCheckout(row)}
                      >
                        <RefreshCw className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t px-5 py-3 text-sm text-muted-foreground">
        <p>
          Showing {history.data.length} day(s) for{" "}
          {format(new Date(year, month - 1, 1), "MMMM yyyy")}
        </p>
      </div>

      <Modal
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
        title={
          selectedRow
            ? format(parseISO(selectedRow.attendanceDate), "EEEE, dd MMM yyyy")
            : "Day report"
        }
        description="Attendance report for this day."
        cancelLabel="Close"
        contentClassName="sm:max-w-md"
      >
        {selectedRow ? <DayReportCard row={selectedRow} /> : null}
      </Modal>

      <EmployeeRegularizationDialog
        row={regularizeRow}
        open={Boolean(regularizeRow)}
        onOpenChange={(open) => {
          if (!open) setRegularizeRow(null);
        }}
      />
    </section>
  );
}

function DayReportCard({ row }: { row: ManagerAttendanceHistoryRow }) {
  const expectedHours = DEFAULT_ATTENDANCE_RULES.fullDayMinimumHours;
  const workedLabel = row.workHours > 0 ? formatHoursLabel(row.workHours) : "—";
  const expectedLabel = formatHoursLabel(expectedHours);
  const isComplete =
    row.workHours >= expectedHours ||
    row.attendanceStatus === "present" ||
    row.attendanceStatus === "late";
  const progress = Math.min(
    100,
    Math.round((row.workHours / Math.max(expectedHours, 1)) * 100),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <AttendanceHistoryStatusCell status={row.attendanceStatus} />
        {isComplete ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Check className="size-2.5" strokeWidth={3} />
            </span>
            Marked
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border bg-muted/20 px-3.5 py-3">
          <p className="text-xs text-muted-foreground">Check in</p>
          <p className="mt-1 text-base font-semibold tabular-nums">
            {formatAttendanceTime(row.checkInAt)}
          </p>
        </div>
        <div className="rounded-xl border bg-muted/20 px-3.5 py-3">
          <p className="text-xs text-muted-foreground">Check out</p>
          <p className="mt-1 text-base font-semibold tabular-nums">
            {formatAttendanceTime(row.checkOutAt)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border px-3.5 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Working hours</p>
            <p className="mt-1 text-base font-semibold tabular-nums">
              {workedLabel}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}
                / {expectedLabel}
              </span>
            </p>
          </div>
          {isComplete ? (
            <span className="flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
              <Check className="size-4" strokeWidth={2.5} />
            </span>
          ) : (
            <span className="text-sm font-medium text-muted-foreground">
              {progress}%
            </span>
          )}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isComplete ? "bg-emerald-500" : "bg-orange-400",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {(row.lateMinutes > 0 || row.remarks) && (
        <div className="space-y-2 text-sm">
          {row.lateMinutes > 0 ? (
            <p className="text-muted-foreground">
              Late:{" "}
              <span className="font-medium text-foreground">
                {formatLateByLabel(row.lateMinutes)}
              </span>
            </p>
          ) : null}
          {row.remarks ? (
            <p className="text-muted-foreground">
              Remarks:{" "}
              <span className="font-medium text-foreground">{row.remarks}</span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
