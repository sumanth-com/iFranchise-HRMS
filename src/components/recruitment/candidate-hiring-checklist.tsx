"use client";

import { format } from "date-fns";
import {
  CalendarPlus,
  Check,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import { OfferStageCelebration } from "@/components/recruitment/offer-stage-celebration";
import { HiringStageTrack } from "@/components/recruitment/hiring-stage-track";
import {
  cancelInterviewAction,
  completeInterviewAction,
  updateOfferStatusAction,
} from "@/lib/recruitment/actions";
import {
  INTERVIEW_STATUS_LABELS,
  OFFER_STATUS_LABELS,
  RECOMMENDATION_LABELS,
} from "@/lib/recruitment/constants";
import { formatCurrency } from "@/lib/recruitment/services/recruitment-utils";
import { cn } from "@/lib/utils";
import { interviewCompleteSchema } from "@/lib/validations/recruitment";
import type {
  CandidateDetail,
  InterviewListItem,
  OfferListItem,
  OfferStatus,
} from "@/types/recruitment";

type CandidateHiringChecklistProps = {
  detail: CandidateDetail;
  canInterview: boolean;
  canOffer: boolean;
  onRefresh: () => void;
};

export function CandidateHiringChecklist({
  detail,
  canInterview,
  canOffer,
  onRefresh,
}: CandidateHiringChecklistProps) {
  const [completing, setCompleting] = useState<InterviewListItem | null>(null);
  const [offerCelebrate, setOfferCelebrate] = useState(false);

  return (
    <>
      <section className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Interview & offer hub</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {canInterview || canOffer
              ? "Mark interviews done and move offers forward — no separate tabs needed."
              : "Interview history and offer status for this candidate."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <HubCard title="Interviews">
          <InterviewHub
            interviews={detail.interviews}
            canInterview={canInterview}
            onComplete={(iv) => setCompleting(iv)}
            onRefresh={onRefresh}
          />
        </HubCard>

        <HubCard title="Offer">
          <OfferHub
            offers={detail.offers}
            canOffer={canOffer}
            onRefresh={onRefresh}
            onAccepted={() => setOfferCelebrate(true)}
          />
        </HubCard>
      </div>

      {completing ? (
        <CompleteInterviewModal
          open={!!completing}
          onOpenChange={(open) => !open && setCompleting(null)}
          interview={completing}
          onSuccess={() => {
            setCompleting(null);
            onRefresh();
          }}
        />
      ) : null}
      </section>

      <OfferStageCelebration
        open={offerCelebrate}
        candidateName={detail.fullName}
        onClose={() => setOfferCelebrate(false)}
      />
    </>
  );
}

function HubCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[9.5rem] flex-col rounded-lg border bg-muted/10 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="mt-2 min-h-0 flex-1">{children}</div>
    </div>
  );
}

function InterviewHub({
  interviews,
  canInterview,
  onComplete,
  onRefresh,
}: {
  interviews: InterviewListItem[];
  canInterview: boolean;
  onComplete: (interview: InterviewListItem) => void;
  onRefresh: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {interviews.length === 0 ? (
        <div className="flex min-h-[6.5rem] flex-col items-center justify-center rounded-md border border-dashed bg-background/60 px-3 py-3 text-center">
          <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
          {canInterview ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Use Schedule interview below.
            </p>
          ) : null}
        </div>
      ) : (
        <ul className="max-h-[11rem] space-y-2 overflow-y-auto pr-0.5">
          {interviews.map((interview) => {
            const isDone = interview.interviewStatus === "completed";
            const isScheduled = interview.interviewStatus === "scheduled";

            return (
              <li
                key={interview.id}
                className={cn(
                  "rounded-lg border px-2.5 py-2 transition-colors",
                  isDone && "border-emerald-200 bg-emerald-50/50",
                  isScheduled && "border-primary/20 bg-primary/5",
                  !isDone && !isScheduled && "bg-background/80",
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2",
                      isDone && "border-emerald-500 bg-emerald-500 text-white",
                      isScheduled &&
                        "border-primary bg-primary/10 text-primary hiring-stage-node-current",
                      !isDone &&
                        !isScheduled &&
                        "border-muted-foreground/30 bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    ) : (
                      <CalendarPlus className="h-3 w-3" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-medium leading-tight">{interview.roundName}</p>
                      <RecruitmentStatusBadge
                        status={interview.interviewStatus}
                        label={INTERVIEW_STATUS_LABELS[interview.interviewStatus]}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {format(new Date(interview.interviewDate), "d MMM yyyy")}
                      {interview.interviewTime ? ` · ${interview.interviewTime}` : ""}
                    </p>
                    {interview.interviewerName ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {interview.interviewerName}
                      </p>
                    ) : null}
                    {isDone && interview.rating != null ? (
                      <p className="mt-0.5 text-xs text-emerald-700">
                        Rating {interview.rating}/5
                        {interview.recommendation
                          ? ` · ${RECOMMENDATION_LABELS[interview.recommendation]}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>

                {canInterview && isScheduled ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button size="sm" className="h-7 text-xs" onClick={() => onComplete(interview)}>
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Mark done
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await cancelInterviewAction(interview.id);
                          if (!result.success) toast.error(result.message);
                          else {
                            toast.success("Interview cancelled");
                            onRefresh();
                          }
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

const OFFER_STEPS: OfferStatus[] = ["draft", "sent", "accepted"];

function OfferHub({
  offers,
  canOffer,
  onRefresh,
  onAccepted,
}: {
  offers: OfferListItem[];
  canOffer: boolean;
  onRefresh: () => void;
  onAccepted: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const offer = offers[0];

  function setStatus(offerId: string, offerStatus: OfferStatus, celebrate = false) {
    startTransition(async () => {
      const result = await updateOfferStatusAction({ offerId, offerStatus });
      if (!result.success) toast.error(result.message);
      else {
        if (offerStatus === "accepted" && result.data.employeeId) {
          toast.success("Offer accepted — employee created");
          onAccepted();
        } else {
          toast.success(`Offer marked as ${OFFER_STATUS_LABELS[offerStatus]}`);
          if (celebrate && offerStatus === "accepted") onAccepted();
        }
        onRefresh();
      }
    });
  }

  function handleOfferStepClick(step: OfferStatus, stepIndex: number) {
    if (!canOffer || !offer || isPending) return;

    const activeIndex = OFFER_STEPS.indexOf(offer.offerStatus);
    if (activeIndex < 0) return;

    if (offer.employeeId && stepIndex < activeIndex) {
      toast.error("Employee already created — cannot revert offer");
      return;
    }

    if (stepIndex < activeIndex) {
      setStatus(offer.id, step);
      return;
    }

    if (offer.offerStatus === "accepted" && stepIndex === activeIndex) {
      if (offer.employeeId) {
        toast.error("Employee already created — cannot revert");
        return;
      }
      setStatus(offer.id, "sent");
      return;
    }

    if (stepIndex === activeIndex) {
      if (step === "draft") setStatus(offer.id, "sent");
      else if (step === "sent") setStatus(offer.id, "accepted", true);
      return;
    }

    if (stepIndex === activeIndex + 1) {
      setStatus(offer.id, step, step === "accepted");
    }
  }

  return (
    <>
      {!offer ? (
        <div className="flex min-h-[6.5rem] flex-col items-center justify-center rounded-md border border-dashed bg-background/60 px-3 py-3 text-center">
          <p className="text-sm text-muted-foreground">No offer generated yet.</p>
          {canOffer ? (
            <p className="mt-1 text-xs text-muted-foreground">Use the Offers tab to send an offer letter.</p>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "rounded-md border bg-background/80 px-2.5 py-2.5",
            offer.offerStatus === "accepted" && "border-emerald-200 bg-emerald-50/40",
            offer.offerStatus === "rejected" && "border-destructive/30 bg-destructive/5",
            offer.offerStatus === "sent" && "border-amber-200 bg-amber-50/30",
            offer.offerStatus === "draft" && "border-border",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{formatCurrency(offer.salary)}</p>
              <p className="text-xs text-muted-foreground">
                Joining {format(new Date(offer.joiningDate), "d MMM yyyy")}
              </p>
              {offer.departmentName ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {offer.departmentName}
                </p>
              ) : null}
            </div>
            <RecruitmentStatusBadge
              status={offer.offerStatus}
              label={OFFER_STATUS_LABELS[offer.offerStatus]}
            />
          </div>

          {offer.offerLetterPath ? (
            <div className="mt-2 rounded-md border bg-background/80 px-2 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Offer letter
              </p>
              <a
                href={`/api/recruitment/offers/${offer.id}/pdf`}
                className="mt-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
              >
                Download offer letter
              </a>
            </div>
          ) : null}

          {offer.offerStatus !== "rejected" && offer.offerStatus !== "expired" ? (
            <div className="mt-2 -mx-1">
              <HiringStageTrack
                className="text-[9px]"
                items={OFFER_STEPS.map((step, index) => {
                  const activeIndex = OFFER_STEPS.indexOf(offer.offerStatus);
                  const isAccepted = offer.offerStatus === "accepted";
                  const isPast = isAccepted || index < activeIndex;
                  const isCurrent =
                    !isAccepted && offer.offerStatus !== "rejected" && index === activeIndex;
                  const isClickable =
                    canOffer &&
                    (isPast ||
                      isCurrent ||
                      index === activeIndex + 1 ||
                      (isAccepted && index === activeIndex));

                  const actionHint = isPast && isAccepted && index === activeIndex
                    ? "Undo"
                    : isPast && !isAccepted
                      ? "Undo"
                      : isCurrent && step === "sent"
                        ? "Now · Accept"
                        : isCurrent && step === "draft"
                          ? "Now · Mark sent"
                          : index === activeIndex + 1
                            ? "Select"
                            : null;

                  const visualState = isPast ? "completed" : isCurrent ? "current" : "pending";

                  return {
                    id: step,
                    label: OFFER_STATUS_LABELS[step],
                    hint: isClickable ? actionHint : isCurrent ? "Now" : null,
                    state: visualState,
                    isClickable,
                    disabled: isPending,
                    onClick: () => handleOfferStepClick(step, index),
                    title: isClickable
                      ? isPast
                        ? `Revert to ${OFFER_STATUS_LABELS[step]}`
                        : `Move to ${OFFER_STATUS_LABELS[step]}`
                      : undefined,
                  };
                })}
              />
            </div>
          ) : null}

          {canOffer && offer.offerStatus === "sent" ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={isPending}
                onClick={() => setStatus(offer.id, "rejected")}
              >
                <XCircle className="mr-1 h-3 w-3" />
                Declined
              </Button>
            </div>
          ) : null}
          {offer.employeeId ? (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 className="h-3 w-3" />
              Employee linked
            </p>
          ) : null}
        </div>
      )}
    </>
  );
}

function CompleteInterviewModal({
  open,
  onOpenChange,
  interview,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: InterviewListItem;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof interviewCompleteSchema>>({
    resolver: zodResolver(interviewCompleteSchema),
    defaultValues: {
      interviewId: interview.id,
      rating: 3,
      comments: "",
      recommendation: "next_round",
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Mark interview done"
      description={`${interview.roundName} — add quick feedback`}
      contentClassName="sm:max-w-lg"
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await completeInterviewAction(values);
              if (!result.success) toast.error(result.message);
              else {
                toast.success("Interview marked as done");
                onSuccess();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Save & complete
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Rating (1–5)</Label>
          <Input type="number" min={1} max={5} disabled={isPending} {...form.register("rating")} />
        </div>
        <div className="space-y-2">
          <Label>Comments</Label>
          <Input disabled={isPending} {...form.register("comments")} />
        </div>
        <div className="space-y-2">
          <Label>Recommendation</Label>
          <LabeledSelect
            items={toSelectItems(RECOMMENDATION_LABELS)}
            value={form.watch("recommendation")}
            onValueChange={(v) =>
              form.setValue(
                "recommendation",
                v as z.input<typeof interviewCompleteSchema>["recommendation"],
              )
            }
            disabled={isPending}
          />
        </div>
      </div>
    </Modal>
  );
}
