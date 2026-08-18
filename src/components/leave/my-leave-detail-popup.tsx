"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { LeaveForm } from "@/components/leave/leave-form";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { LeaveDurationBreakdownCard } from "@/components/leave/leave-apply-policy-panel";
import {
  deleteLeaveRequestAction,
  getLeaveDetailAction,
} from "@/lib/leave/actions";
import {
  formatHalfDayPeriod,
  formatLeaveDate,
} from "@/lib/leave/services/leave-utils";
import type { LeaveDetail, LeaveListItem, LeaveLookups } from "@/types/leave";

type Props = {
  leaveRequestId: string | null;
  preview?: LeaveListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups?: LeaveLookups | null;
  canEdit?: boolean;
  canDelete?: boolean;
  initialMode?: "view" | "edit" | "delete";
  onActionComplete?: () => void;
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function toPartialDetail(preview: LeaveListItem): LeaveDetail {
  return {
    id: preview.id,
    employeeId: preview.employeeId,
    employeeCode: preview.employeeCode,
    employeeName: preview.employeeName,
    departmentName: preview.departmentName,
    branchName: preview.branchName,
    leaveTypeId: preview.leaveTypeId,
    leaveTypeName: preview.leaveTypeName,
    leaveTypeCode: preview.leaveTypeCode,
    startDate: preview.startDate,
    endDate: preview.endDate,
    totalDays: preview.totalDays,
    isHalfDay: preview.isHalfDay,
    halfDayPeriod: preview.halfDayPeriod,
    reason: preview.reason,
    emergencyContactName: null,
    emergencyContactPhone: null,
    attachmentPath: null,
    leaveStatus: preview.leaveStatus,
    appliedAt: preview.appliedAt,
    updatedAt: preview.appliedAt,
    approvals: [],
    canApprove: false,
    canReject: false,
    canCancel: false,
    canEdit: preview.leaveStatus === "pending",
    canDelete: preview.leaveStatus === "pending",
  };
}

export function MyLeaveDetailPopup({
  leaveRequestId,
  preview = null,
  open,
  onOpenChange,
  lookups = null,
  canEdit = false,
  canDelete = false,
  initialMode = "view",
  onActionComplete,
}: Props) {
  const [detail, setDetail] = useState<LeaveDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "delete">(initialMode);
  const [isPending, startAction] = useTransition();

  useEffect(() => {
    if (!open || !leaveRequestId) {
      setDetail(null);
      setLoadError(null);
      setIsFetching(false);
      setMode("view");
      return;
    }

    let cancelled = false;
    setLoadError(null);
    setMode(initialMode);
    setDetail(preview ? toPartialDetail(preview) : null);
    setIsFetching(true);

    void (async () => {
      try {
        const result = await getLeaveDetailAction(leaveRequestId);
        if (cancelled) return;
        if (!result.success) {
          setLoadError(result.message);
          if (!preview) setDetail(null);
          toast.error(result.message);
          return;
        }
        setDetail(result.data);
        setLoadError(null);
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load leave request";
        setLoadError(message);
        if (!preview) setDetail(null);
        toast.error(message);
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally omit preview/onOpenChange to avoid re-fetch loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch when dialog opens, id, or mode entry changes
  }, [open, leaveRequestId, initialMode]);

  const showEdit =
    Boolean(detail?.canEdit ?? (canEdit && detail?.leaveStatus === "pending")) &&
    Boolean(lookups);
  const showDelete = Boolean(
    detail?.canDelete ?? (canDelete && detail?.leaveStatus === "pending"),
  );

  const dateRange =
    detail && detail.startDate === detail.endDate
      ? formatLeaveDate(detail.startDate)
      : detail
        ? `${formatLeaveDate(detail.startDate)} – ${formatLeaveDate(detail.endDate)}`
        : "";

  function handleDelete() {
    if (!detail) return;
    startAction(async () => {
      const result = await deleteLeaveRequestAction(detail.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Leave request deleted");
      setMode("view");
      onOpenChange(false);
      onActionComplete?.();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) setMode("view");
        onOpenChange(next);
      }}
      title={
        mode === "edit"
          ? "Edit leave request"
          : mode === "delete"
            ? "Delete leave request"
            : detail
              ? detail.leaveTypeName
              : "Leave details"
      }
      description={
        mode === "edit"
          ? "Update your pending leave request."
          : mode === "delete"
            ? "This removes the request and restores your leave balance."
            : detail
              ? `${dateRange} · ${detail.totalDays} day${detail.totalDays === 1 ? "" : "s"}`
              : "Loading leave request…"
      }
      contentClassName="sm:max-w-lg"
      showCancel={false}
      headerAddon={
        detail && mode === "view" ? (
          <LeaveStatusBadge status={detail.leaveStatus} />
        ) : null
      }
      footer={
        mode === "edit" ? null : mode === "delete" ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setMode("view")}
            >
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDelete}
            >
              Confirm delete
            </Button>
          </div>
        ) : detail ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {showDelete ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => setMode("delete")}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : null}
            {showEdit ? (
              <Button type="button" disabled={isPending} onClick={() => setMode("edit")}>
                <Pencil className="size-4" />
                Edit
              </Button>
            ) : null}
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        )
      }
    >
      {isFetching && !detail ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading leave details…
        </div>
      ) : loadError && !detail ? (
        <p className="py-6 text-center text-sm text-destructive">{loadError}</p>
      ) : !detail ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Leave request not found.
        </p>
      ) : mode === "edit" && lookups ? (
        <LeaveForm
          lookups={lookups}
          defaultEmployeeId={detail.employeeId}
          mode="edit"
          initialRequest={{
            id: detail.id,
            employeeId: detail.employeeId,
            leaveTypeId: detail.leaveTypeId,
            startDate: detail.startDate,
            endDate: detail.endDate,
            isHalfDay: detail.isHalfDay,
            halfDayPeriod: detail.halfDayPeriod,
            reason: detail.reason ?? "",
          }}
          variant="self"
          onSuccess={() => {
            setMode("view");
            onOpenChange(false);
            onActionComplete?.();
          }}
          onCancel={() => setMode("view")}
        />
      ) : mode === "delete" ? (
        <p className="text-sm text-muted-foreground">
          Delete {detail.leaveTypeName} for {dateRange}? This cannot be undone.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailField label="Leave type" value={detail.leaveTypeName} />
            <DetailField
              label="Duration"
              value={
                detail.isHalfDay
                  ? `Half day (${formatHalfDayPeriod(detail.halfDayPeriod) ?? "—"})`
                  : `${detail.totalDays} day${detail.totalDays === 1 ? "" : "s"}`
              }
            />
            {detail.durationBreakdown ? (
              <div className="sm:col-span-2 rounded-lg border bg-muted/20 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">How this was calculated</p>
                <div className="mt-2">
                  <LeaveDurationBreakdownCard breakdown={detail.durationBreakdown} />
                </div>
              </div>
            ) : null}
            <DetailField label="Start date" value={formatLeaveDate(detail.startDate)} />
            <DetailField label="End date" value={formatLeaveDate(detail.endDate)} />
            <DetailField
              label="Applied on"
              value={new Date(detail.appliedAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            />
            <DetailField
              label="Status"
              value={
                detail.leaveStatus === "pending"
                  ? "Pending HR"
                  : detail.leaveStatus === "approved"
                    ? "Approved by HR"
                    : detail.leaveStatus === "rejected"
                      ? "Rejected by HR"
                      : detail.leaveStatus
              }
            />
          </div>
          <div className="rounded-lg border px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Reason</p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {detail.reason?.trim() || "—"}
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}

