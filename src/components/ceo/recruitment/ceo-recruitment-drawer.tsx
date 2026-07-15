"use client";

import { format } from "date-fns";
import { ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchCeoRecruitmentCandidateDetailAction } from "@/lib/ceo/actions/ceo-recruitment-actions";
import {
  CANDIDATE_STAGE_LABELS,
  INTERVIEW_STATUS_LABELS,
  OFFER_STATUS_LABELS,
} from "@/lib/recruitment/constants";
import { formatCurrency } from "@/lib/recruitment/services/recruitment-utils";
import type { CeoRecruitmentCandidateDetail } from "@/types/ceo-recruitment";

type CeoRecruitmentDrawerProps = {
  candidateId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export function CeoRecruitmentDrawer({
  candidateId,
  open,
  onOpenChange,
}: CeoRecruitmentDrawerProps) {
  const [detail, setDetail] = useState<CeoRecruitmentCandidateDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !candidateId) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await fetchCeoRecruitmentCandidateDetailAction(candidateId);
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, candidateId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Candidate Profile</SheetTitle>
        </SheetHeader>

        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading candidate…
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        ) : detail ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              {detail.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={detail.photoUrl}
                  alt={detail.fullName}
                  className="size-14 rounded-full object-cover"
                />
              ) : (
                <EmployeeAvatar
                  firstName={detail.firstName}
                  lastName={detail.lastName}
                  profileImagePath={null}
                  className="size-14"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{detail.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {detail.candidateCode}
                  {detail.jobTitle ? ` · ${detail.jobTitle}` : ""}
                </p>
                <div className="mt-1">
                  <RecruitmentStatusBadge
                    status={detail.stage}
                    label={CANDIDATE_STAGE_LABELS[detail.stage]}
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Email" value={detail.email} />
              <Field label="Phone" value={detail.phone} />
              <Field
                label="Experience"
                value={
                  detail.experienceYears != null
                    ? `${detail.experienceYears} years`
                    : null
                }
              />
              <Field label="Education" value={detail.education} />
              <Field label="Current Stage" value={CANDIDATE_STAGE_LABELS[detail.stage]} />
              <Field label="Assigned Recruiter" value={detail.recruiterName} />
              <Field label="Department" value={detail.departmentName} />
              <Field label="Expected Salary" value={formatCurrency(detail.expectedCtc)} />
              <Field
                label="Offer Status"
                value={
                  detail.offerStatus ? OFFER_STATUS_LABELS[detail.offerStatus] : null
                }
              />
              <Field
                label="Expected Joining Date"
                value={
                  detail.expectedJoiningDate
                    ? format(new Date(detail.expectedJoiningDate), "d MMM yyyy")
                    : null
                }
              />
              <Field
                label="Resume"
                value={
                  detail.resumeUrl ? (
                    <a
                      href={detail.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Open resume
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : null
                }
              />
              <Field
                label="Skills"
                value={
                  detail.skills.length > 0 ? detail.skills.join(", ") : null
                }
              />
            </div>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Interview Timeline</h3>
              {detail.timeline.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No timeline events.</p>
              ) : (
                <ol className="mt-2 space-y-2">
                  {detail.timeline.map((event) => (
                    <li key={event.id} className="text-sm">
                      <p className="font-medium">{event.title}</p>
                      {event.description ? (
                        <p className="text-muted-foreground">{event.description}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.createdAt), "d MMM yyyy · h:mm a")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Feedback History</h3>
              {detail.interviews.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No interview feedback yet.</p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {detail.interviews.map((interview) => (
                    <li key={interview.id} className="rounded-lg border px-3 py-2.5 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{interview.roundName}</p>
                        <RecruitmentStatusBadge
                          status={interview.interviewStatus}
                          label={INTERVIEW_STATUS_LABELS[interview.interviewStatus]}
                        />
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {format(new Date(interview.interviewDate), "d MMM yyyy")}
                        {interview.interviewTime ? ` · ${interview.interviewTime}` : ""}
                        {interview.interviewerName
                          ? ` · ${interview.interviewerName}`
                          : ""}
                      </p>
                      {interview.rating != null ? (
                        <p className="mt-1">Rating: {interview.rating}/5</p>
                      ) : null}
                      {interview.comments ? (
                        <p className="mt-1 text-muted-foreground">{interview.comments}</p>
                      ) : null}
                      {interview.recommendation ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recommendation: {interview.recommendation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Notes</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {detail.notes?.trim() || "No notes recorded."}
              </p>
            </section>

            <p className="text-xs text-muted-foreground">
              CEO access is view-only. Recruitment records cannot be edited from this portal.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
