"use client";

import { format } from "date-fns";
import { CheckCircle2, Eye, Loader2, XCircle } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { LeavePanel } from "@/components/ceo/leave/ceo-leave-tables";
import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { decideCeoExitAction } from "@/lib/ceo/actions/ceo-exit-actions";
import { broadcastApprovalChange } from "@/lib/approvals/use-approvals-sync";
import { getResignationDetailAction } from "@/lib/exit/actions";
import { EXIT_STATUS_LABELS } from "@/lib/exit/constants";
import type { ExitResignationItem } from "@/types/exit";

type Props = {
  items?: ExitResignationItem[] | null;
  isLoading?: boolean;
  onActed: (item?: ExitResignationItem, status?: "approved" | "rejected") => void;
};

type ReviewState = {
  item: ExitResignationItem;
  detail: ExitResignationItem | null;
  loading: boolean;
};

export function CeoExitApprovalQueue({
  items,
  isLoading,
  onActed,
}: Props) {
  const rows = Array.isArray(items) ? items : [];
  const [review, setReview] = useState<ReviewState | null>(null);
  const [remarks, setRemarks] = useState("");
  const [rejectedReason, setRejectedReason] = useState("");
  const [isActing, startActing] = useTransition();

  const closeReview = () => {
    setReview(null);
    setRemarks("");
    setRejectedReason("");
  };

  useEffect(() => {
    if (!review?.item) return;

    let cancelled = false;
    setReview((prev) => (prev ? { ...prev, loading: true, detail: null } : null));

    void getResignationDetailAction(review.item.id).then((result) => {
      if (cancelled) return;
      if (!result.success || !result.data) {
        toast.error(result.message ?? "Could not load resignation details");
        setReview((prev) => (prev ? { ...prev, loading: false } : null));
        return;
      }
      setReview((prev) =>
        prev ? { ...prev, loading: false, detail: result.data as ExitResignationItem } : null,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [review?.item.id]);

  function submitDecision(decision: "approve" | "reject") {
    if (!review?.item) return;
    if (decision === "reject" && rejectedReason.trim().length < 3) {
      toast.error("Rejection reason is required (minimum 3 characters)");
      return;
    }

    const item = review.item;
    startActing(async () => {
      const result = await decideCeoExitAction({
        resignationId: item.id,
        decision,
        remarks: remarks.trim() || null,
        rejectedReason: decision === "reject" ? rejectedReason.trim() || null : null,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(
        decision === "approve"
          ? "Resignation approved — employee account deactivated"
          : "Resignation rejected",
      );
      closeReview();
      broadcastApprovalChange("exit");
      onActed(item, decision === "approve" ? "approved" : "rejected");
    });
  }

  const detail = review?.detail ?? review?.item;

  return (
    <>
      <LeavePanel
        title="CEO Exit Queue"
        description="Resignations awaiting your final approval. Approval completes the resignation and deactivates portal access."
        count={rows.length}
      >
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
              <tr className="border-white/10 bg-transparent hover:bg-white/5">
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">
                  Employee
                </th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">
                  Department
                </th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">
                  Submitted
                </th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">
                  Last day
                </th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">
                  Reason
                </th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">
                  Status
                </th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 text-right align-middle text-xs font-semibold uppercase tracking-wide text-white">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {isLoading
                      ? "Loading…"
                      : "No resignations awaiting CEO approval."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.employeeName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.employeeCode}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.departmentName ?? "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(row.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(row.lastWorkingDay), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="line-clamp-2 max-w-xs">{row.reason}</span>
                    </td>
                    <td className="px-4 py-3">
                      {EXIT_STATUS_LABELS[row.exitStatus]}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2"
                          disabled={isActing}
                          onClick={() =>
                            setReview({ item: row, detail: null, loading: true })
                          }
                        >
                          <Eye className="size-3.5" />
                          Review
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </LeavePanel>

      <Modal
        open={Boolean(review)}
        onOpenChange={(open) => !open && closeReview()}
        title="Review resignation"
        description={
          detail
            ? `${detail.employeeName} · ${detail.employeeCode}`
            : undefined
        }
        contentClassName="sm:max-w-2xl"
        showCancel={false}
        footer={
          <>
            <Button variant="outline" onClick={closeReview} disabled={isActing}>
              Close
            </Button>
            <Button
              variant="outline"
              disabled={isActing || review?.loading}
              onClick={() => submitDecision("reject")}
            >
              <XCircle className="size-4" />
              Reject resignation
            </Button>
            <Button
              disabled={isActing || review?.loading}
              onClick={() => submitDecision("approve")}
            >
              <CheckCircle2 className="size-4" />
              Approve resignation
            </Button>
          </>
        }
      >
        {review?.loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading resignation details…
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailField label="Employee" value={detail.employeeName} />
              <DetailField label="Department" value={detail.departmentName ?? "—"} />
              <DetailField label="Designation" value={detail.designationTitle ?? "—"} />
              <DetailField
                label="Submitted date"
                value={format(new Date(detail.createdAt), "dd MMM yyyy")}
              />
              <DetailField
                label="Proposed last working day"
                value={format(new Date(detail.lastWorkingDay), "dd MMM yyyy")}
              />
              <DetailField label="Current status" value={EXIT_STATUS_LABELS[detail.exitStatus]} />
              <DetailField label="Reason" value={detail.reason} className="sm:col-span-2" />
              {detail.comments ? (
                <DetailField label="Comments" value={detail.comments} className="sm:col-span-2" />
              ) : null}
            </div>

            {detail.timeline && detail.timeline.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Approval history
                </p>
                <ul className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  {detail.timeline.map((event) => (
                    <li key={event.id} className="text-sm">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{event.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.createdAt), "dd MMM yyyy, HH:mm")}
                        </span>
                      </div>
                      {event.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {event.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="ceo-exit-remarks">Approval remarks (optional)</Label>
              <textarea
                id="ceo-exit-remarks"
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                disabled={isActing}
                placeholder="Optional notes for the approval record"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ceo-exit-reject-reason">Rejection reason (required to reject)</Label>
              <textarea
                id="ceo-exit-reject-reason"
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={rejectedReason}
                onChange={(event) => setRejectedReason(event.target.value)}
                disabled={isActing}
                placeholder="Required if you reject this resignation"
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

function DetailField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
