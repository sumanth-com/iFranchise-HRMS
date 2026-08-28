"use client";

import { format } from "date-fns";
import { ArrowRight, CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { formatCeoCurrency } from "@/components/ceo/ceo-module-primitives";
import { Label } from "@/components/ui/label";
import {
  approveCeoApprovalAction,
  deleteCeoApprovalAction,
  fetchCeoApprovalsDetailAction,
  rejectCeoApprovalAction,
} from "@/lib/ceo/actions/ceo-approvals-actions";
import { broadcastApprovalChange } from "@/lib/approvals/use-approvals-sync";
import type {
  CeoApprovalsDetail,
  CeoApprovalsPromotionDetail,
} from "@/types/ceo-approvals";

type CeoApprovalsDrawerProps = {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forwardOptions?: { id: string; label: string }[];
  onChanged: () => void;
};

type ActionMode = "approve" | "reject" | "delete" | null;

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-sm font-medium break-words">{value || "—"}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function PromotionSummary({ promotion }: { promotion: CeoApprovalsPromotionDetail }) {
  const hasSalary =
    promotion.currentSalary != null || promotion.proposedSalary != null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SectionTitle>Employee</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Name"
            value={
              promotion.employeeCode
                ? `${promotion.employeeName} · ${promotion.employeeCode}`
                : promotion.employeeName
            }
          />
          <Field label="Department" value={promotion.departmentName} />
        </div>
      </div>

      <div className="space-y-2">
        <SectionTitle>Role change</SectionTitle>
        <div className="flex flex-col gap-2 rounded-lg border px-3 py-3 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Current role</p>
            <p className="mt-0.5 truncate text-sm font-medium">
              {promotion.currentDesignation ?? "—"}
            </p>
          </div>
          <ArrowRight
            className="hidden size-4 shrink-0 text-muted-foreground sm:block"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Proposed role</p>
            <p className="mt-0.5 truncate text-sm font-semibold">
              {promotion.proposedDesignation ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {hasSalary ? (
        <div className="space-y-2">
          <SectionTitle>Compensation impact</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Current"
              value={
                promotion.currentSalary != null
                  ? formatCeoCurrency(promotion.currentSalary)
                  : null
              }
            />
            <Field
              label="Proposed"
              value={
                promotion.proposedSalary != null
                  ? formatCeoCurrency(promotion.proposedSalary)
                  : null
              }
            />
            <Field
              label="Increase"
              value={
                promotion.salaryIncrease != null
                  ? `${formatCeoCurrency(promotion.salaryIncrease)}${
                      promotion.salaryIncreasePercent != null
                        ? ` (${promotion.salaryIncreasePercent}%)`
                        : ""
                    }`
                  : null
              }
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Status" value={promotion.statusLabel} />
        <Field
          label="Effective date"
          value={
            promotion.effectiveFrom
              ? format(new Date(promotion.effectiveFrom), "dd MMM yyyy")
              : "On approval"
          }
        />
        <Field label="Recommended by" value={promotion.recommendedByName} />
        <Field
          label="Recommended on"
          value={format(new Date(promotion.recommendedAt), "dd MMM yyyy")}
        />
      </div>

      {promotion.reason ? (
        <div className="space-y-2">
          <SectionTitle>Reason</SectionTitle>
          <p className="rounded-lg border px-3 py-2.5 text-sm whitespace-pre-wrap">
            {promotion.reason}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function CeoApprovalsDrawer({
  requestId,
  open,
  onOpenChange,
  onChanged,
}: CeoApprovalsDrawerProps) {
  const [detail, setDetail] = useState<CeoApprovalsDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [notes, setNotes] = useState("");
  const [isPending, startAction] = useTransition();

  useEffect(() => {
    if (!open || !requestId) {
      setDetail(null);
      setLoadError(null);
      setActionMode(null);
      setNotes("");
      setIsFetching(false);
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    setLoadError(null);
    setActionMode(null);
    setNotes("");

    void fetchCeoApprovalsDetailAction({ requestId }).then((result) => {
      if (cancelled) return;
      setIsFetching(false);
      if (!result.success) {
        setDetail(null);
        setLoadError(result.message);
        toast.error(result.message);
        return;
      }
      setDetail(result.data);
    });

    return () => {
      cancelled = true;
    };
  }, [open, requestId]);

  function closePopup() {
    setActionMode(null);
    setNotes("");
    onOpenChange(false);
  }

  function finishAction(message: string) {
    toast.success(message);
    broadcastApprovalChange("executive");
    onChanged();
    closePopup();
  }

  function handleApprove() {
    if (!detail) return;
    startAction(async () => {
      const result = await approveCeoApprovalAction({
        requestId: detail.id,
        remarks: notes.trim() || undefined,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      finishAction(result.message);
    });
  }

  function handleReject() {
    if (!detail) return;
    if (notes.trim().length < 3) {
      toast.error("Rejection reason is required");
      return;
    }
    startAction(async () => {
      const result = await rejectCeoApprovalAction({
        requestId: detail.id,
        reason: notes.trim(),
        remarks: notes.trim(),
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      finishAction(result.message);
    });
  }

  function handleDelete() {
    if (!detail) return;
    startAction(async () => {
      const result = await deleteCeoApprovalAction({ requestId: detail.id });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      finishAction(result.message);
    });
  }

  const showApprove = Boolean(detail?.canAct);
  const showReject = Boolean(detail?.canAct);
  const showDelete = Boolean(detail?.canDelete ?? true);
  const showInitialSpinner = isFetching && !detail && !loadError;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setActionMode(null);
          setNotes("");
          setLoadError(null);
        }
        onOpenChange(next);
      }}
      title={
        detail?.promotion
          ? `Promotion · ${detail.promotion.employeeName}`
          : (detail?.title ?? "Promotion approval")
      }
      description={
        detail
          ? `${detail.requestCode} · ${detail.statusLabel}`
          : loadError
            ? "Could not load this approval"
            : "Loading approval…"
      }
      contentClassName="sm:max-w-xl"
      showCancel={false}
      footer={
        detail && !actionMode ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={closePopup}>
              Close
            </Button>
            {showDelete ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => setActionMode("delete")}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : null}
            {showReject ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setNotes("");
                  setActionMode("reject");
                }}
              >
                <XCircle className="size-4" />
                Reject
              </Button>
            ) : null}
            {showApprove ? (
              <Button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setNotes("");
                  setActionMode("approve");
                }}
              >
                <CheckCircle2 className="size-4" />
                Approve
              </Button>
            ) : null}
          </div>
        ) : detail && actionMode ? (
          <div className="flex w-full flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setActionMode(null);
                setNotes("");
              }}
            >
              Back
            </Button>
            {actionMode === "approve" ? (
              <Button type="button" disabled={isPending} onClick={handleApprove}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm approve
              </Button>
            ) : null}
            {actionMode === "reject" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleReject}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm reject
              </Button>
            ) : null}
            {actionMode === "delete" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={handleDelete}
              >
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm delete
              </Button>
            ) : null}
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={closePopup}>
            Close
          </Button>
        )
      }
    >
      {showInitialSpinner ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading approval…
        </div>
      ) : loadError && !detail ? (
        <div className="space-y-3 py-6 text-center">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button type="button" variant="outline" onClick={closePopup}>
            Close
          </Button>
        </div>
      ) : !detail ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Approval not found.
        </div>
      ) : actionMode === "approve" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Approve {detail.requestCode}? This records the CEO decision and completes the
            request.
          </p>
          <div className="space-y-2">
            <Label htmlFor="ceo-approval-approve-note">Remarks (optional)</Label>
            <textarea
              id="ceo-approval-approve-note"
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
              placeholder="Optional approval remarks"
            />
          </div>
        </div>
      ) : actionMode === "reject" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Reject {detail.requestCode}? A reason is required.
          </p>
          <div className="space-y-2">
            <Label htmlFor="ceo-approval-reject-note">Rejection reason *</Label>
            <textarea
              id="ceo-approval-reject-note"
              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
              placeholder="Enter reason for rejection"
            />
          </div>
        </div>
      ) : actionMode === "delete" ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Remove {detail.requestCode} from the executive queue? Pending source workflows
            are rejected. This cannot be undone.
          </p>
        </div>
      ) : detail.promotion ? (
        <PromotionSummary promotion={detail.promotion} />
      ) : (
        <div className="py-10 text-center text-sm text-muted-foreground">
          The promotion record for this request is no longer available.
        </div>
      )}
    </Modal>
  );
}
