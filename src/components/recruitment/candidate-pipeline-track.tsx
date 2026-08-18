"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/common/button";

import {
  HiringStageTrack,
  type HiringStageVisualState,
} from "@/components/recruitment/hiring-stage-track";
import { OfferStageCelebration } from "@/components/recruitment/offer-stage-celebration";
import { moveCandidateStageAction } from "@/lib/recruitment/actions";
import {
  CANDIDATE_PROFILE_PIPELINE,
  CANDIDATE_STAGE_LABELS,
} from "@/lib/recruitment/constants";
import { cn } from "@/lib/utils";
import type {
  CandidateDetail,
  CandidateStage,
  InterviewListItem,
  OfferListItem,
  TimelineItem,
} from "@/types/recruitment";

type StepState = "completed" | "current" | "pending" | "rejected";

type PipelinePosition = {
  effectiveIndex: number;
  isRejected: boolean;
  isJoined: boolean;
  offerCompleted: boolean;
};

function hasSentOfferLetter(offers: OfferListItem[]): boolean {
  return offers.some((offer) => offer.offerStatus === "sent" || offer.offerStatus === "accepted");
}

function getPipelinePosition(
  stage: CandidateStage,
  timeline: TimelineItem[],
  offerCompleted = false,
): PipelinePosition {
  if (stage === "joined") {
    return {
      effectiveIndex: CANDIDATE_PROFILE_PIPELINE.length,
      isRejected: false,
      isJoined: true,
      offerCompleted: true,
    };
  }

  if (stage === "rejected") {
    let maxIdx = -1;
    for (const item of timeline) {
      if (item.eventType !== "stage_change") continue;
      for (const pipelineStage of CANDIDATE_PROFILE_PIPELINE) {
        if (item.title.includes(CANDIDATE_STAGE_LABELS[pipelineStage])) {
          const idx = CANDIDATE_PROFILE_PIPELINE.indexOf(pipelineStage);
          if (idx > maxIdx) maxIdx = idx;
        }
      }
    }
    return { effectiveIndex: maxIdx, isRejected: true, isJoined: false, offerCompleted: false };
  }

  if (stage === "applied") {
    return { effectiveIndex: -1, isRejected: false, isJoined: false, offerCompleted: false };
  }

  if (stage === "offer" && offerCompleted) {
    return {
      effectiveIndex: CANDIDATE_PROFILE_PIPELINE.length,
      isRejected: false,
      isJoined: false,
      offerCompleted: true,
    };
  }

  const idx = CANDIDATE_PROFILE_PIPELINE.indexOf(stage);
  return {
    effectiveIndex: idx >= 0 ? idx : -1,
    isRejected: false,
    isJoined: false,
    offerCompleted: false,
  };
}

function stepState(index: number, position: PipelinePosition): StepState {
  const { effectiveIndex, isRejected, isJoined, offerCompleted } = position;

  if (isJoined || offerCompleted) return "completed";

  if (isRejected && index === effectiveIndex) return "rejected";
  if (isRejected && index < effectiveIndex) return "completed";
  if (isRejected) return "pending";

  if (effectiveIndex < 0) {
    return index === 0 ? "current" : "pending";
  }

  if (index < effectiveIndex) return "completed";
  if (index === effectiveIndex) return "current";
  return "pending";
}

function toVisualState(state: StepState): HiringStageVisualState {
  return state;
}

/** Stage to restore when undoing an accidental rejection. */
export function getUndoRejectStage(detail: CandidateDetail): CandidateStage {
  for (const item of detail.timeline) {
    if (
      item.eventType === "stage_change" &&
      item.toStage === "rejected" &&
      item.fromStage &&
      item.fromStage !== "rejected" &&
      item.fromStage !== "joined"
    ) {
      return item.fromStage as CandidateStage;
    }
  }

  const position = getPipelinePosition("rejected", detail.timeline);
  if (position.effectiveIndex >= 0) {
    return CANDIDATE_PROFILE_PIPELINE[position.effectiveIndex];
  }

  return "screening";
}

type CandidatePipelineTrackProps = {
  detail: CandidateDetail;
  className?: string;
  canEdit: boolean;
  onRefresh: () => void;
};

type PendingMove = {
  stage: CandidateStage;
  title: string;
  description: string;
  reason?: string;
} | null;

export function CandidatePipelineTrack({
  detail,
  className,
  canEdit,
  onRefresh,
}: CandidatePipelineTrackProps) {
  const [isPending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove>(null);
  const offerCompleted = hasSentOfferLetter(detail.offers);
  const position = getPipelinePosition(detail.stage, detail.timeline, offerCompleted);
  const canManage = canEdit;
  const isRejected = detail.stage === "rejected";

  function moveToStage(targetStage: CandidateStage, reason?: string) {
    const shouldCelebrate = targetStage === "offer" && detail.stage !== "offer";

    startTransition(async () => {
      const result = await moveCandidateStageAction({
        candidateId: detail.id,
        stage: targetStage,
        reason: reason ?? "Updated from hiring pipeline",
      });
      if (!result.success) toast.error(result.message);
      else {
        const message =
          detail.stage === "rejected" && targetStage !== "rejected"
            ? `Rejection undone — restored to ${CANDIDATE_STAGE_LABELS[targetStage]}`
            : `Moved to ${CANDIDATE_STAGE_LABELS[targetStage]}`;
        toast.success(message);
        if (shouldCelebrate) setCelebrate(true);
        onRefresh();
      }
    });
  }

  function handleStageClick(pipelineStage: CandidateStage, index: number) {
    if (!canManage || isPending) return;

    const state = stepState(index, position);

    if (isRejected && state === "rejected") {
      setPendingMove({
        stage: pipelineStage,
        reason: "Rejection undone from pipeline",
        title: `Restore to ${CANDIDATE_STAGE_LABELS[pipelineStage]}?`,
        description: `This will undo the rejection and move the candidate back to ${CANDIDATE_STAGE_LABELS[pipelineStage]}.`,
      });
      return;
    }

    if (!isRejected) {
      if (state === "completed") {
        setPendingMove({
          stage: pipelineStage,
          title: `Move back to ${CANDIDATE_STAGE_LABELS[pipelineStage]}?`,
          description: `This will move the candidate back to the ${CANDIDATE_STAGE_LABELS[pipelineStage]} stage.`,
        });
        return;
      }

      if (state === "pending") {
        setPendingMove({
          stage: pipelineStage,
          title: `Move to ${CANDIDATE_STAGE_LABELS[pipelineStage]}?`,
          description: `This will mark the candidate as ${CANDIDATE_STAGE_LABELS[pipelineStage]}.`,
        });
        return;
      }

      if (state === "current") {
        const nextStage = CANDIDATE_PROFILE_PIPELINE[index + 1];
        if (nextStage) {
          setPendingMove({
            stage: nextStage,
            title: `Complete ${CANDIDATE_STAGE_LABELS[pipelineStage]}?`,
            description: `This will mark ${CANDIDATE_STAGE_LABELS[pipelineStage]} as completed and move the candidate to ${CANDIDATE_STAGE_LABELS[nextStage]}.`,
          });
        } else if (index > 0) {
          const previousStage = CANDIDATE_PROFILE_PIPELINE[index - 1];
          setPendingMove({
            stage: previousStage,
            title: `Move back to ${CANDIDATE_STAGE_LABELS[previousStage]}?`,
            description: `This will move the candidate back to ${CANDIDATE_STAGE_LABELS[previousStage]}.`,
          });
        }
      }
    }
  }

  const trackItems = CANDIDATE_PROFILE_PIPELINE.map((pipelineStage, index) => {
    const state = stepState(index, position);
    const isLast = index === CANDIDATE_PROFILE_PIPELINE.length - 1;
    const nextStage = CANDIDATE_PROFILE_PIPELINE[index + 1];
    const isClickable =
      canManage &&
      ((isRejected && state === "rejected") ||
        (!isRejected &&
          (state === "completed" ||
            state === "pending" ||
            (state === "current" && (nextStage !== undefined || index > 0)))));

    const actionHint =
      isRejected && state === "rejected"
        ? "Undo reject"
        : offerCompleted && pipelineStage === "offer" && state === "completed"
          ? "Completed"
          : state === "completed"
            ? "Undo"
          : state === "current" && nextStage
            ? `Now · → ${CANDIDATE_STAGE_LABELS[nextStage]}`
            : state === "current" && isLast
              ? "Now · Undo"
              : state === "current"
                ? "Now"
                : state === "pending"
                  ? "Select"
                  : null;

    const title = isClickable
      ? isRejected && state === "rejected"
        ? `Undo rejection — restore to ${CANDIDATE_STAGE_LABELS[pipelineStage]}`
        : state === "completed"
          ? `Move back to ${CANDIDATE_STAGE_LABELS[pipelineStage]}`
          : state === "current" && nextStage
            ? `Complete and move to ${CANDIDATE_STAGE_LABELS[nextStage]}`
            : state === "current" && isLast
              ? `Move back to ${CANDIDATE_STAGE_LABELS[CANDIDATE_PROFILE_PIPELINE[index - 1]]}`
              : `Move to ${CANDIDATE_STAGE_LABELS[pipelineStage]}`
      : state === "completed"
        ? `${CANDIDATE_STAGE_LABELS[pipelineStage]} completed`
        : undefined;

    return {
      id: pipelineStage,
      label: CANDIDATE_STAGE_LABELS[pipelineStage],
      hint: isClickable ? actionHint : state === "current" ? "Now" : null,
      state: toVisualState(state),
      isClickable,
      disabled: isPending,
      onClick: () => handleStageClick(pipelineStage, index),
      title,
    };
  });

  return (
    <>
      <div className={cn("space-y-3", className)}>
        <div>
          <h3 className="text-sm font-semibold">Hiring pipeline</h3>
          {canManage ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isRejected
                ? "Click the red stage to undo rejection"
                : "Click to advance — tap completed stages to undo"}
            </p>
          ) : null}
        </div>

        <HiringStageTrack items={trackItems} />
      </div>

      <OfferStageCelebration
        open={celebrate}
        candidateName={detail.fullName}
        onClose={() => setCelebrate(false)}
      />
      <Dialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingMove?.title ?? "Confirm stage update"}</DialogTitle>
            <DialogDescription>
              {pendingMove?.description ?? "Are you sure you want to update this candidate stage?"}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPendingMove(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending || !pendingMove}
              onClick={() => {
                if (!pendingMove) return;
                const nextMove = pendingMove;
                setPendingMove(null);
                moveToStage(nextMove.stage, nextMove.reason);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function buildInterviewTrackRounds(interviews: InterviewListItem[]) {
  return [...interviews]
    .sort((a, b) => a.interviewDate.localeCompare(b.interviewDate))
    .map((iv) => ({
      roundName: iv.roundName,
      interviewStatus: iv.interviewStatus,
      interviewDate: iv.interviewDate,
      interviewTime: iv.interviewTime,
    }));
}

export function hasActiveOffer(offers: OfferListItem[]) {
  return offers.some(
    (o) => o.offerStatus === "draft" || o.offerStatus === "sent",
  );
}
