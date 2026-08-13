"use client";

import { format } from "date-fns";
import { CheckCircle2, Loader2, Trash2, XCircle } from "lucide-react";
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
import { EXECUTIVE_APPROVAL_PRIORITY_LABELS } from "@/lib/ceo/executive-approvals-constants";
import type { CeoApprovalsDetail } from "@/types/ceo-approvals";

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
      title={detail?.title ?? "Approval details"}
      description={
        detail
          ? `${detail.requestCode} · ${detail.approvalTypeLabel} · ${detail.statusLabel}`
          : loadError
            ? "Could not load this approval"
            : "Loading approval…"
      }
      contentClassName="sm:max-w-xl"
      showCancel={false}
      headerAddon={
        detail ? (
          <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
            {EXECUTIVE_APPROVAL_PRIORITY_LABELS[detail.priority]}
          </span>
        ) : null
      }
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
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type" value={detail.approvalTypeLabel} />
            <Field label="Status" value={detail.statusLabel} />
            <Field
              label="Priority"
              value={EXECUTIVE_APPROVAL_PRIORITY_LABELS[detail.priority]}
            />
            <Field
              label="Financial impact"
              value={formatCeoCurrency(detail.financialImpact)}
            />
            <Field label="Department" value={detail.departmentName} />
            <Field label="Requester" value={detail.requestedByName ?? "System / HR"} />
            <Field
              label="Submitted"
              value={format(new Date(detail.submittedAt), "dd MMM yyyy HH:mm")}
            />
            <Field
              label="Due"
              value={
                detail.dueAt ? format(new Date(detail.dueAt), "dd MMM yyyy") : "—"
              }
            />
          </div>

          <div className="rounded-lg border px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Business justification</p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {detail.businessJustification || detail.summary || "—"}
            </p>
          </div>

          {detail.riskAssessment ? (
            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Risk assessment</p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{detail.riskAssessment}</p>
            </div>
          ) : null}

          {detail.supportingDocuments.length > 0 || detail.attachments.length > 0 ? (
            <div className="rounded-lg border px-3 py-2.5">
              <p className="text-xs text-muted-foreground">Documents</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {[...detail.supportingDocuments, ...detail.attachments].map(
                  (doc, index) => (
                    <li key={`${doc.name}-${index}`}>
                      {doc.url ? (
                        <a
                          href={doc.url}
                          className="font-medium text-primary hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {doc.name}
                        </a>
                      ) : (
                        <span>{doc.name}</span>
                      )}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ) : null}

          {(showApprove || showReject || showDelete) && (
            <p className="text-xs text-muted-foreground">
              Use Approve, Reject, or Delete below to take action without leaving this page.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
