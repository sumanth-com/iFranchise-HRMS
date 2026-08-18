"use client";

import { format } from "date-fns";
import {
  CalendarPlus,
  FilePlus2,
  Loader2,
  Mail,
  Phone,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";

import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { Button } from "@/components/common/button";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import { CandidateHiringChecklist } from "@/components/recruitment/candidate-hiring-checklist";
import {
  CandidatePipelineTrack,
  getUndoRejectStage,
} from "@/components/recruitment/candidate-pipeline-track";
import {
  CANDIDATE_STAGE_LABELS,
  getCandidateStageBadge,
} from "@/lib/recruitment/constants";
import { formatCurrency } from "@/lib/recruitment/services/recruitment-utils";
import { cn } from "@/lib/utils";
import type { CandidateDetail } from "@/types/recruitment";

type CandidateDetailPanelProps = {
  detail: CandidateDetail | null;
  loading: boolean;
  onClose: () => void;
  canEdit: boolean;
  canInterview: boolean;
  canOffer: boolean;
  onScheduleInterview?: () => void;
  showSendOffer?: boolean;
  onSendOffer?: () => void;
  onReject: () => void;
  onUndoReject: () => void;
  rejecting: boolean;
  onRefresh: () => void;
};

function ProfileField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-background/60 px-3 py-2", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

export function CandidateDetailPanel({
  detail,
  loading,
  onClose,
  canEdit,
  canInterview,
  canOffer,
  onScheduleInterview,
  showSendOffer = false,
  onSendOffer,
  onReject,
  onUndoReject,
  rejecting,
  onRefresh,
}: CandidateDetailPanelProps) {
  const isJoined = detail?.stage === "joined";
  const isRejected = detail?.stage === "rejected";
  const restoreStageLabel = detail && isRejected
    ? CANDIDATE_STAGE_LABELS[getUndoRejectStage(detail)]
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Candidate profile
          </p>
          {detail ? (
            <h2 className="truncate text-lg font-semibold">{detail.fullName}</h2>
          ) : (
            <h2 className="text-lg font-semibold text-muted-foreground">Loading…</h2>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={onClose}
          aria-label="Close candidate profile"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-6">
        {loading && !detail ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading candidate…
          </div>
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border bg-gradient-to-br from-muted/30 to-background p-4">
              <EmployeeAvatar
                firstName={detail.firstName}
                lastName={detail.lastName}
                profileImagePath={detail.photoPath}
                className="h-14 w-14 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-semibold">{detail.fullName}</p>
                  <RecruitmentStatusBadge
                    {...getCandidateStageBadge(
                      detail.stage,
                      detail.latestOfferStatus ?? detail.offers[0]?.offerStatus,
                    )}
                  />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/90">{detail.jobTitle}</span>
                  <span className="text-muted-foreground/40" aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{detail.email}</span>
                  </span>
                  {detail.phone ? (
                    <>
                      <span className="text-muted-foreground/40" aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {detail.phone}
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <section className="rounded-xl border p-4">
              <CandidatePipelineTrack
                detail={detail}
                canEdit={canEdit}
                onRefresh={onRefresh}
              />
            </section>

            <CandidateHiringChecklist
              detail={detail}
              canInterview={canInterview}
              canOffer={canOffer}
              onRefresh={onRefresh}
            />

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Profile details</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <ProfileField label="Department" value={detail.departmentName ?? "—"} />
                <ProfileField
                  label="Experience"
                  value={
                    detail.experienceYears != null
                      ? `${detail.experienceYears} years`
                      : "—"
                  }
                />
                <ProfileField label="Current company" value={detail.currentCompany ?? "—"} />
                <ProfileField label="Source" value={detail.source ?? "—"} />
                <ProfileField label="Current CTC" value={formatCurrency(detail.currentCtc)} />
                <ProfileField label="Expected CTC" value={formatCurrency(detail.expectedCtc)} />
                <ProfileField
                  label="Notice period"
                  value={
                    detail.noticePeriodDays != null
                      ? `${detail.noticePeriodDays} days`
                      : "—"
                  }
                />
                <ProfileField
                  label="Applied on"
                  value={format(new Date(detail.createdAt), "d MMM yyyy")}
                />
                <ProfileField
                  label="Skills"
                  value={detail.skills.length ? detail.skills.join(", ") : "—"}
                  className="sm:col-span-2"
                />
                <ProfileField
                  label="Notes"
                  value={detail.notes?.trim() || "—"}
                  className="sm:col-span-2"
                />
              </div>
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Activity timeline</h3>
              {detail.timeline.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No events yet.</p>
              ) : (
                <ol className="mt-3 space-y-3">
                  {detail.timeline.map((item) => (
                    <li key={item.id} className="border-l-2 border-primary/30 pl-3">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.createdAt), "d MMM yyyy · h:mm a")}
                      </p>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        ) : null}
      </div>

      {detail && !isJoined ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t bg-muted/10 px-4 py-3">
          {!isRejected && canInterview && onScheduleInterview ? (
            <Button size="sm" variant="outline" onClick={onScheduleInterview}>
              <CalendarPlus className="mr-1 h-3.5 w-3.5" />
              Schedule interview
            </Button>
          ) : null}
          {!isRejected && canOffer && showSendOffer && onSendOffer ? (
            <Button size="sm" variant="outline" onClick={onSendOffer}>
              <FilePlus2 className="mr-1 h-3.5 w-3.5" />
              Send offer
            </Button>
          ) : null}
          {canEdit && isRejected ? (
            <Button size="sm" variant="outline" disabled={rejecting} onClick={onUndoReject}>
              {rejecting ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="mr-1 h-3.5 w-3.5" />
              )}
              Undo rejection
              {restoreStageLabel ? (
                <span className="ml-1 text-muted-foreground">· {restoreStageLabel}</span>
              ) : null}
            </Button>
          ) : null}
          {canEdit && !isRejected ? (
            <Button size="sm" variant="outline" disabled={rejecting} onClick={onReject}>
              {rejecting ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <XCircle className="mr-1 h-3.5 w-3.5" />
              )}
              Reject candidate
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
