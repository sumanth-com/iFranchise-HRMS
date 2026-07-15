"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  commentCeoApprovalAction,
  approveCeoApprovalAction,
  clarifyCeoApprovalAction,
  fetchCeoApprovalsDetailAction,
  forwardCeoApprovalAction,
  rejectCeoApprovalAction,
  reviseCeoApprovalAction,
} from "@/lib/ceo/actions/ceo-approvals-actions";
import { formatCeoCurrency } from "@/components/ceo/ceo-module-primitives";
import {
  EXECUTIVE_APPROVAL_PRIORITY_LABELS,
} from "@/lib/ceo/executive-approvals-constants";
import { cn } from "@/lib/utils";
import type { CeoApprovalsDetail } from "@/types/ceo-approvals";

type ForwardOption = { id: string; label: string };

const textareaClassName = cn(
  "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

type CeoApprovalsDrawerProps = {
  requestId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  forwardOptions: ForwardOption[];
  onChanged: () => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium break-words">{value || "—"}</div>
    </div>
  );
}

export function CeoApprovalsDrawer({
  requestId,
  open,
  onOpenChange,
  forwardOptions,
  onChanged,
}: CeoApprovalsDrawerProps) {
  const [detail, setDetail] = useState<CeoApprovalsDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [remarks, setRemarks] = useState("");
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [forwardTo, setForwardTo] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [isActing, startActing] = useTransition();

  function reload(id: string) {
    startTransition(async () => {
      const result = await fetchCeoApprovalsDetailAction({ requestId: id });
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }

  useEffect(() => {
    if (!open || !requestId) {
      setDetail(null);
      setError(null);
      setMessage(null);
      setRemarks("");
      setReason("");
      setComment("");
      setForwardTo("");
      return;
    }
    reload(requestId);
  }, [open, requestId]);

  function runAction(action: () => Promise<{ success: boolean; message: string }>) {
    startActing(async () => {
      const result = await action();
      setMessage(result.message);
      if (!result.success) return;
      if (requestId) reload(requestId);
      onChanged();
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Approval Details</SheetTitle>
        </SheetHeader>

        {isPending && !detail ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading approval…
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        ) : detail ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold">{detail.title}</p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                  {detail.requestCode}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.approvalTypeLabel} · {detail.statusLabel}
              </p>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Approval Information</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Priority" value={EXECUTIVE_APPROVAL_PRIORITY_LABELS[detail.priority]} />
                <Field
                  label="Financial Impact"
                  value={formatCeoCurrency(detail.financialImpact)}
                />
                <Field label="Department" value={detail.departmentName} />
                <Field label="Requester" value={detail.requestedByName ?? "System / HR"} />
                <Field label="Requester Email" value={detail.requestedByEmail} />
                <Field
                  label="Submitted"
                  value={format(new Date(detail.submittedAt), "dd MMM yyyy HH:mm")}
                />
                <Field
                  label="Due"
                  value={
                    detail.dueAt
                      ? format(new Date(detail.dueAt), "dd MMM yyyy")
                      : "—"
                  }
                />
                <Field label="Reviewed By" value={detail.reviewedByName} />
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Business Justification</h3>
              <p className="rounded-lg border bg-background/80 px-3 py-2.5 text-sm">
                {detail.businessJustification || detail.summary || "—"}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Risk Assessment</h3>
              <p className="rounded-lg border bg-background/80 px-3 py-2.5 text-sm">
                {detail.riskAssessment || "—"}
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Supporting Documents</h3>
              {detail.supportingDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No supporting documents.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {detail.supportingDocuments.map((doc, index) => (
                    <li key={`${doc.name}-${index}`} className="rounded-lg border px-3 py-2">
                      <p className="font-medium">{doc.name}</p>
                      {doc.meta ? (
                        <p className="text-xs text-muted-foreground">{doc.meta}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Attachments</h3>
              {detail.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {detail.attachments.map((doc, index) => (
                    <li key={`${doc.name}-${index}`} className="rounded-lg border px-3 py-2">
                      {doc.url ? (
                        <a href={doc.url} className="font-medium text-primary hover:underline">
                          {doc.name}
                        </a>
                      ) : (
                        <p className="font-medium">{doc.name}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Timeline</h3>
              <ol className="space-y-2">
                {detail.timeline.map((item) => (
                  <li key={item.id} className="rounded-lg border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{item.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.occurredAt), "dd MMM yyyy HH:mm")}
                      </span>
                    </div>
                    {item.description ? (
                      <p className="mt-1 text-muted-foreground">{item.description}</p>
                    ) : null}
                    {item.actorName ? (
                      <p className="mt-1 text-xs text-muted-foreground">By {item.actorName}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Previous Decisions</h3>
              {detail.previousDecisions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prior decisions for this type.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {detail.previousDecisions.map((item) => (
                    <li key={item.id} className="rounded-lg border px-3 py-2">
                      <p className="font-medium">{item.decision}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.actorName ?? "CEO"} ·{" "}
                        {format(new Date(item.decidedAt), "dd MMM yyyy")}
                      </p>
                      {item.reason ? <p className="mt-1">{item.reason}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Comments</h3>
              {detail.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {detail.comments.map((item) => (
                    <li key={item.id} className="rounded-lg border px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">
                          {item.authorName ?? "CEO"}
                          {item.isExecutiveRemark ? " · Executive remark" : ""}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "dd MMM yyyy")}
                        </span>
                      </div>
                      <p className="mt-1">{item.commentText}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {detail.canAct ? (
              <section className="space-y-3 rounded-xl border bg-card p-4">
                <h3 className="text-sm font-semibold">Approval Actions</h3>
                <textarea
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  placeholder="Executive remarks (optional)"
                  rows={2}
                  className={textareaClassName}
                />
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Reason required for reject / revision / clarification"
                  rows={2}
                  className={textareaClassName}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isActing}
                    onClick={() =>
                      runAction(() =>
                        approveCeoApprovalAction({
                          requestId: detail.id,
                          remarks: remarks || undefined,
                        }),
                      )
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isActing || reason.trim().length < 3}
                    onClick={() =>
                      runAction(() =>
                        rejectCeoApprovalAction({
                          requestId: detail.id,
                          reason,
                          remarks: remarks || undefined,
                        }),
                      )
                    }
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isActing || reason.trim().length < 3}
                    onClick={() =>
                      runAction(() =>
                        reviseCeoApprovalAction({
                          requestId: detail.id,
                          reason,
                          remarks: remarks || undefined,
                        }),
                      )
                    }
                  >
                    Send Back for Revision
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isActing || reason.trim().length < 3}
                    onClick={() =>
                      runAction(() =>
                        clarifyCeoApprovalAction({
                          requestId: detail.id,
                          reason,
                          remarks: remarks || undefined,
                        }),
                      )
                    }
                  >
                    Request More Information
                  </Button>
                </div>

                <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Select
                    value={forwardTo || undefined}
                    onValueChange={(value) => setForwardTo(value ?? "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Forward to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {forwardOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isActing || !forwardTo}
                    onClick={() =>
                      runAction(() =>
                        forwardCeoApprovalAction({
                          requestId: detail.id,
                          forwardToEmployeeId: forwardTo,
                          remarks: remarks || undefined,
                        }),
                      )
                    }
                  >
                    Forward
                  </Button>
                </div>
              </section>
            ) : null}

            <section className="space-y-2 rounded-xl border bg-card p-4">
              <h3 className="text-sm font-semibold">Add Executive Remarks</h3>
              <Input
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add a comment or executive remark"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isActing || comment.trim().length < 1}
                  onClick={() =>
                    runAction(() =>
                      commentCeoApprovalAction({
                        requestId: detail.id,
                        comment,
                        isExecutiveRemark: false,
                      }).then((result) => {
                        if (result.success) setComment("");
                        return result;
                      }),
                    )
                  }
                >
                  Add Comment
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={isActing || comment.trim().length < 1}
                  onClick={() =>
                    runAction(() =>
                      commentCeoApprovalAction({
                        requestId: detail.id,
                        comment,
                        isExecutiveRemark: true,
                      }).then((result) => {
                        if (result.success) setComment("");
                        return result;
                      }),
                    )
                  }
                >
                  Save Executive Remark
                </Button>
              </div>
            </section>

            {message ? (
              <p className="text-sm text-muted-foreground">{message}</p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              CEO access can approve, reject, comment, and request clarification. Employee
              records and payroll data cannot be edited from this drawer.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
