"use client";

import { format, parseISO } from "date-fns";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import {
  AttendanceTimeline,
} from "@/components/manager/attendance/manager-attendance-table";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  approveTeamAttendanceCorrectionAction,
  fetchTeamAttendanceDetailAction,
  rejectTeamAttendanceCorrectionAction,
} from "@/lib/manager/actions/manager-attendance-actions";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import type { AttendanceStatus } from "@/types/attendance";
import type { TeamAttendanceDetailBundle } from "@/types/manager-attendance";
import { cn } from "@/lib/utils";

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function formatHours(hours: number) {
  if (hours <= 0) return "—";
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes <= 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

function formatBreakMinutes(minutes: number) {
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours <= 0) return `${remainder}m`;
  return remainder > 0 ? `${hours}h ${remainder}m` : `${hours}h`;
}

type ManagerAttendanceDetailDrawerProps = {
  attendanceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewComplete?: () => void;
};

export function ManagerAttendanceDetailDrawer({
  attendanceId,
  open,
  onOpenChange,
  onReviewComplete,
}: ManagerAttendanceDetailDrawerProps) {
  const [detail, setDetail] = useState<TeamAttendanceDetailBundle | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isLoading, startLoading] = useTransition();
  const [isPending, startAction] = useTransition();

  useEffect(() => {
    if (!open || !attendanceId) return;
    setDetail(null);
    setReviewNotes("");
    startLoading(async () => {
      const bundle = await fetchTeamAttendanceDetailAction(attendanceId);
      setDetail(bundle);
    });
  }, [open, attendanceId]);

  const historyColumns: DataTableColumn<TeamAttendanceDetailBundle["history"][number]>[] = [
    {
      key: "attendanceDate",
      header: "Date",
      render: (row) => format(parseISO(row.attendanceDate), "d MMM yyyy"),
    },
    {
      key: "checkInAt",
      header: "Check In",
      render: (row) => formatAttendanceTime(row.checkInAt),
    },
    {
      key: "checkOutAt",
      header: "Check Out",
      render: (row) => formatAttendanceTime(row.checkOutAt),
    },
    {
      key: "workHours",
      header: "Hours",
      render: (row) => formatHours(row.workHours),
    },
    {
      key: "attendanceStatus",
      header: "Status",
      render: (row) => (
        <AttendanceStatusBadge status={row.attendanceStatus as AttendanceStatus} />
      ),
    },
  ];

  function handleReview(approve: boolean) {
    if (!detail?.correction || detail.correction.correctionStatus !== "pending") return;

    startAction(async () => {
      const action = approve
        ? approveTeamAttendanceCorrectionAction
        : rejectTeamAttendanceCorrectionAction;
      const result = await action({
        correctionId: detail.correction!.id,
        reviewNotes: reviewNotes.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onReviewComplete?.();
      const refreshed = await fetchTeamAttendanceDetailAction(detail.id);
      setDetail(refreshed);
    });
  }

  const monitoringFlags = detail
    ? [
        detail.monitoring.isLate ? "Late arrival" : null,
        detail.monitoring.isEarlyExit ? "Early exit" : null,
        detail.monitoring.missingCheckIn ? "Missing check-in" : null,
        detail.monitoring.missingCheckOut ? "Missing check-out" : null,
      ].filter(Boolean)
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>
            {detail
              ? `${detail.employeeName} · ${format(parseISO(detail.attendanceDate), "d MMM yyyy")}`
              : "Attendance details"}
          </SheetTitle>
        </SheetHeader>

        {isLoading && !detail ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !detail ? (
          <div className="p-6">
            <EmptyState
              title="Record not found"
              description="This attendance record could not be loaded."
            />
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Employee Information</h3>
              <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                <DetailField label="Employee" value={detail.employeeName} />
                <DetailField label="Employee ID" value={detail.employeeCode} />
                <DetailField label="Department" value={detail.departmentName ?? "—"} />
                <DetailField label="Designation" value={detail.designationTitle ?? "—"} />
                <DetailField label="Employment Type" value={detail.employmentTypeName ?? "—"} />
                <DetailField label="Work Location" value={detail.branchName ?? "—"} />
                {detail.employeeEmail ? (
                  <DetailField label="Email" value={detail.employeeEmail} />
                ) : null}
              </div>
            </section>

            {monitoringFlags.length ? (
              <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      Attendance alerts
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm text-amber-800 dark:text-amber-300">
                      {monitoringFlags.map((flag) => (
                        <li key={flag}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Attendance Timeline</h3>
              <AttendanceTimeline
                checkInAt={detail.checkInAt}
                checkOutAt={detail.checkOutAt}
                attendanceDate={detail.attendanceDate}
              />
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Check In" value={formatAttendanceTime(detail.checkInAt)} />
              <DetailField label="Check Out" value={formatAttendanceTime(detail.checkOutAt)} />
              <DetailField label="Total Hours" value={formatHours(detail.workHours)} />
              <DetailField label="Break Duration" value={formatBreakMinutes(detail.breakMinutes)} />
              <DetailField label="Overtime" value={formatHours(detail.overtimeHours)} />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <AttendanceStatusBadge status={detail.attendanceStatus} />
              </div>
              {detail.locationLabel ? (
                <DetailField label="GPS / Location" value={detail.locationLabel} />
              ) : null}
              {detail.deviceLabel ? (
                <DetailField label="Device Used" value={detail.deviceLabel} />
              ) : null}
              {detail.notes ? (
                <div className="sm:col-span-2">
                  <DetailField label="Notes" value={detail.notes} />
                </div>
              ) : null}
            </section>

            {detail.correction ? (
              <section className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">Regularization Request</h3>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      detail.correction.correctionStatus === "pending" &&
                        "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                      detail.correction.correctionStatus === "approved" &&
                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
                      detail.correction.correctionStatus === "rejected" &&
                        "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
                    )}
                  >
                    {detail.correction.correctionStatus}
                  </span>
                </div>
                <DetailField label="Employee reason" value={detail.correction.reason} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField
                    label="Requested check-in"
                    value={formatAttendanceTime(detail.correction.requestedCheckInAt)}
                  />
                  <DetailField
                    label="Requested check-out"
                    value={formatAttendanceTime(detail.correction.requestedCheckOutAt)}
                  />
                </div>
                {detail.correction.reviewNotes ? (
                  <DetailField label="Review remarks" value={detail.correction.reviewNotes} />
                ) : null}

                {detail.correction.correctionStatus === "pending" ? (
                  <div className="space-y-3 border-t pt-3">
                    <div className="space-y-2">
                      <Label htmlFor="review-notes">Approval remarks (optional)</Label>
                      <Input
                        id="review-notes"
                        value={reviewNotes}
                        onChange={(event) => setReviewNotes(event.target.value)}
                        placeholder="Add remarks for the employee"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={isPending} onClick={() => handleReview(true)}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => handleReview(false)}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Attendance History (Last 7 Days)</h3>
              <DataTable
                columns={historyColumns}
                data={detail.history}
                emptyMessage="No recent attendance history."
              />
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
