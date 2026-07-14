"use client";

import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import type { CandidateDrawerTab } from "@/components/manager/recruitment/manager-recruitment-candidates-table";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import {
  cancelTeamRecruitmentInterviewAction,
  fetchTeamCandidateRecruitmentProfileAction,
  recommendTeamCandidateAction,
  rejectTeamCandidateAction,
  rescheduleTeamRecruitmentInterviewAction,
  saveTeamInterviewEvaluationAction,
  scheduleTeamRecruitmentInterviewAction,
  submitTeamInterviewEvaluationAction,
  submitTeamManagerFeedbackAction,
  submitTeamOfferRecommendationAction,
} from "@/lib/manager/actions/manager-recruitment-actions";
import {
  MANAGER_INTERVIEW_COMPETENCY_FIELDS,
  OVERALL_HIRE_RECOMMENDATION_LABELS,
  parseInterviewEvaluationPayload,
  parseOfferNotesPayload,
} from "@/lib/manager/services/recruitment-evaluation-utils";
import {
  CANDIDATE_STAGE_LABELS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  OFFER_STATUS_LABELS,
  RECOMMENDATION_LABELS,
} from "@/lib/recruitment/constants";
import { formatCurrency } from "@/lib/recruitment/services/recruitment-utils";
import type {
  InterviewCompetencyRatings,
  OverallHireRecommendation,
  TeamCandidateRecruitmentProfile,
  TeamRecruitmentLookups,
} from "@/types/manager-recruitment";

export type { CandidateDrawerTab as ProfileTab };

const TABS: { id: CandidateDrawerTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "interview", label: "Interview" },
  { id: "feedback", label: "Feedback" },
  { id: "offer", label: "Offer" },
];

type ManagerRecruitmentProfileDrawerProps = {
  candidateId: string | null;
  initialTab?: CandidateDrawerTab;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managerEmployeeId: string;
  lookups: TeamRecruitmentLookups;
  onActionComplete?: () => void;
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function ManagerRecruitmentProfileDrawer({
  candidateId,
  initialTab = "profile",
  open,
  onOpenChange,
  managerEmployeeId,
  lookups,
  onActionComplete,
}: ManagerRecruitmentProfileDrawerProps) {
  const [tab, setTab] = useState<CandidateDrawerTab>(initialTab);
  const [profile, setProfile] = useState<TeamCandidateRecruitmentProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [scheduleForm, setScheduleForm] = useState({
    roundName: "Manager Round",
    interviewDate: "",
    interviewTime: "10:00",
    interviewType: "google_meet" as "offline" | "google_meet" | "zoom" | "teams",
    meetingLink: "",
    interviewerEmployeeId: managerEmployeeId,
    durationMinutes: 45,
  });

  const [evaluationForm, setEvaluationForm] = useState<{
    interviewId: string;
    competencies: InterviewCompetencyRatings;
    overallRecommendation: OverallHireRecommendation;
    strengths: string;
    improvements: string;
    confidentialNotes: string;
  }>({
    interviewId: "",
    competencies: {},
    overallRecommendation: "hire",
    strengths: "",
    improvements: "",
    confidentialNotes: "",
  });

  const [feedbackForm, setFeedbackForm] = useState({
    feedbackType: "constructive" as const,
    content: "",
  });

  const [offerNotes, setOfferNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    if (!open || !candidateId) {
      setProfile(null);
      return;
    }

    setLoading(true);
    fetchTeamCandidateRecruitmentProfileAction(candidateId)
      .then((data) => {
        setProfile(data);
        if (data?.pendingManagerInterviewId) {
          const interview = data.interviews.find(
            (item) => item.id === data.pendingManagerInterviewId,
          );
          const parsed = parseInterviewEvaluationPayload(interview?.comments);
          setEvaluationForm({
            interviewId: data.pendingManagerInterviewId,
            competencies: parsed.competencies,
            overallRecommendation: parsed.overallRecommendation ?? "hire",
            strengths: parsed.strengths ?? "",
            improvements: parsed.improvements ?? "",
            confidentialNotes: parsed.confidentialNotes ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, [open, candidateId]);

  function refreshProfile() {
    if (!candidateId) return;
    fetchTeamCandidateRecruitmentProfileAction(candidateId).then(setProfile);
    onActionComplete?.();
  }

  function runAction(action: () => Promise<{ success: boolean; message: string }>) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      refreshProfile();
    });
  }

  const pendingInterview = profile?.interviews.find(
    (item) => item.id === profile.pendingManagerInterviewId,
  );
  const pendingOffer = profile?.offers.find((item) => item.id === profile.pendingOfferId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>{profile?.fullName ?? "Candidate Profile"}</SheetTitle>
          {profile ? (
            <p className="text-sm text-muted-foreground">
              {profile.jobTitle}
              {profile.departmentName ? ` · ${profile.departmentName}` : ""}
            </p>
          ) : null}
        </SheetHeader>

        <div className="flex gap-1 overflow-x-auto border-b px-4 py-2">
          {TABS.map((item) => (
            <Button
              key={item.id}
              variant={tab === item.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : !profile ? (
            <EmptyState title="Candidate not found" description="This profile is unavailable." />
          ) : tab === "profile" ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Email" value={profile.email} />
                <DetailField label="Phone" value={profile.phone ?? "—"} />
                <DetailField
                  label="Experience"
                  value={
                    profile.experienceYears != null ? `${profile.experienceYears} years` : "—"
                  }
                />
                <DetailField label="Source" value={profile.source ?? "—"} />
                <DetailField label="Hiring Manager" value={profile.hiringManagerName ?? "—"} />
                <DetailField label="Current Company" value={profile.currentCompany ?? "—"} />
                <DetailField label="Expected CTC" value={formatCurrency(profile.expectedCtc)} />
                <DetailField label="Notice Period" value={
                  profile.noticePeriodDays != null ? `${profile.noticePeriodDays} days` : "—"
                } />
              </div>

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Current Stage
                </p>
                <RecruitmentStatusBadge
                  status={profile.stage}
                  label={CANDIDATE_STAGE_LABELS[profile.stage]}
                />
              </div>

              {profile.skills.length ? (
                <div>
                  <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.resumePath ? (
                <DetailField label="Resume" value={profile.resumePath.split("/").pop() ?? profile.resumePath} />
              ) : null}

              <div>
                <p className="mb-3 text-sm font-semibold">Timeline</p>
                <div className="space-y-3">
                  {profile.timeline.map((event) => (
                    <div key={event.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{event.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(event.createdAt), "dd MMM yyyy HH:mm")}
                        </span>
                      </div>
                      {event.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-semibold">Interview History</p>
                <div className="space-y-3">
                  {profile.interviews.map((interview) => (
                    <div key={interview.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{interview.roundName}</p>
                        <RecruitmentStatusBadge
                          status={interview.interviewStatus}
                          label={INTERVIEW_STATUS_LABELS[interview.interviewStatus]}
                        />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {format(parseISO(interview.interviewDate), "dd MMM yyyy")} ·{" "}
                        {interview.interviewerName}
                      </p>
                      {interview.recommendation ? (
                        <p className="mt-2 text-sm">
                          Recommendation:{" "}
                          {RECOMMENDATION_LABELS[interview.recommendation]}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : tab === "interview" ? (
            <div className="space-y-6">
              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold">Schedule Interview</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Round name</Label>
                    <Input
                      value={scheduleForm.roundName}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, roundName: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={scheduleForm.interviewDate}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, interviewDate: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time</Label>
                    <Input
                      type="time"
                      value={scheduleForm.interviewTime}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, interviewTime: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Interview type</Label>
                    <Select
                      value={scheduleForm.interviewType}
                      onValueChange={(value) =>
                        setScheduleForm((prev) => ({
                          ...prev,
                          interviewType: value as typeof prev.interviewType,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(INTERVIEW_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Panel member</Label>
                    <Select
                      value={scheduleForm.interviewerEmployeeId}
                      onValueChange={(value) => {
                        if (!value) return;
                        setScheduleForm((prev) => ({
                          ...prev,
                          interviewerEmployeeId: value,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {lookups.panelMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Meeting link</Label>
                    <Input
                      value={scheduleForm.meetingLink}
                      onChange={(event) =>
                        setScheduleForm((prev) => ({ ...prev, meetingLink: event.target.value }))
                      }
                      placeholder="Optional meeting URL"
                    />
                  </div>
                </div>
                <Button
                  className="mt-4"
                  disabled={isPending || !scheduleForm.interviewDate}
                  onClick={() =>
                    runAction(() =>
                      scheduleTeamRecruitmentInterviewAction({
                        candidateId: profile.id,
                        ...scheduleForm,
                      }),
                    )
                  }
                >
                  Schedule Interview
                </Button>
              </div>

              {pendingInterview ? (
                <div className="rounded-xl border p-4">
                  <h3 className="text-sm font-semibold">Pending Evaluation</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {pendingInterview.roundName} ·{" "}
                    {format(parseISO(pendingInterview.interviewDate), "dd MMM yyyy")}
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {MANAGER_INTERVIEW_COMPETENCY_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-2">
                        <Label>{field.label}</Label>
                        <Select
                          value={String(evaluationForm.competencies[field.key] ?? "")}
                          onValueChange={(value) =>
                            setEvaluationForm((prev) => ({
                              ...prev,
                              competencies: {
                                ...prev.competencies,
                                [field.key]: Number(value),
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Rate 1-5" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <SelectItem key={rating} value={String(rating)}>
                                {rating}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Overall recommendation</Label>
                    <Select
                      value={evaluationForm.overallRecommendation}
                      onValueChange={(value) =>
                        setEvaluationForm((prev) => ({
                          ...prev,
                          overallRecommendation: value as OverallHireRecommendation,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(OVERALL_HIRE_RECOMMENDATION_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-4 space-y-2">
                    <Label>Strengths</Label>
                    <textarea
                      className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={evaluationForm.strengths}
                      onChange={(event) =>
                        setEvaluationForm((prev) => ({ ...prev, strengths: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Improvements</Label>
                    <textarea
                      className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={evaluationForm.improvements}
                      onChange={(event) =>
                        setEvaluationForm((prev) => ({ ...prev, improvements: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confidential notes</Label>
                    <textarea
                      className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={evaluationForm.confidentialNotes}
                      onChange={(event) =>
                        setEvaluationForm((prev) => ({
                          ...prev,
                          confidentialNotes: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() =>
                          saveTeamInterviewEvaluationAction({
                            ...evaluationForm,
                            draft: true,
                          }),
                        )
                      }
                    >
                      Save Draft
                    </Button>
                    <Button
                      disabled={isPending}
                      onClick={() =>
                        runAction(() =>
                          submitTeamInterviewEvaluationAction({
                            ...evaluationForm,
                            draft: false,
                          }),
                        )
                      }
                    >
                      Submit Evaluation
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() =>
                          rescheduleTeamRecruitmentInterviewAction({
                            interviewId: pendingInterview.id,
                            roundName: pendingInterview.roundName,
                            interviewDate: pendingInterview.interviewDate,
                            interviewTime: pendingInterview.interviewTime,
                            interviewType: pendingInterview.interviewType,
                            meetingLink: pendingInterview.meetingLink,
                          }),
                        )
                      }
                    >
                      Reschedule
                    </Button>
                    <Button
                      variant="destructive"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() => cancelTeamRecruitmentInterviewAction(pendingInterview.id))
                      }
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : tab === "feedback" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Feedback type</Label>
                <Select
                  value={feedbackForm.feedbackType}
                  onValueChange={(value) =>
                    setFeedbackForm((prev) => ({
                      ...prev,
                      feedbackType: value as typeof prev.feedbackType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive Feedback</SelectItem>
                    <SelectItem value="constructive">Constructive Feedback</SelectItem>
                    <SelectItem value="recognition">Recognition</SelectItem>
                    <SelectItem value="coaching">Coaching Notes</SelectItem>
                    <SelectItem value="private">Private Manager Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Feedback</Label>
                <textarea
                  className="min-h-32 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={feedbackForm.content}
                  onChange={(event) =>
                    setFeedbackForm((prev) => ({ ...prev, content: event.target.value }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={isPending || !feedbackForm.content.trim()}
                  onClick={() =>
                    runAction(() =>
                      submitTeamManagerFeedbackAction({
                        candidateId: profile.id,
                        ...feedbackForm,
                        draft: true,
                      }),
                    )
                  }
                >
                  Save Draft
                </Button>
                <Button
                  disabled={isPending || !feedbackForm.content.trim()}
                  onClick={() =>
                    runAction(() =>
                      submitTeamManagerFeedbackAction({
                        candidateId: profile.id,
                        ...feedbackForm,
                        draft: false,
                      }),
                    )
                  }
                >
                  Submit Feedback
                </Button>
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    runAction(() =>
                      recommendTeamCandidateAction({
                        candidateId: profile.id,
                        recommendation: "next_round",
                        notes: feedbackForm.content || undefined,
                      }),
                    )
                  }
                >
                  Recommend Next Round
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {profile.offers.length ? (
                profile.offers.map((offer) => {
                  const parsed = parseOfferNotesPayload(offer.notes);
                  return (
                    <div key={offer.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold">{offer.jobTitle}</h3>
                        <RecruitmentStatusBadge
                          status={offer.offerStatus}
                          label={OFFER_STATUS_LABELS[offer.offerStatus]}
                        />
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <DetailField label="Salary" value={formatCurrency(offer.salary)} />
                        <DetailField
                          label="Joining Date"
                          value={format(parseISO(offer.joiningDate), "dd MMM yyyy")}
                        />
                        <DetailField
                          label="Department"
                          value={offer.departmentName ?? "—"}
                        />
                        <DetailField
                          label="Designation"
                          value={offer.designationTitle ?? "—"}
                        />
                      </div>
                      {parsed.managerRecommendation ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                          Your recommendation: {parsed.managerRecommendation}
                        </p>
                      ) : null}
                      {!parsed.managerRecommendation &&
                      ["draft", "sent"].includes(offer.offerStatus) ? (
                        <div className="mt-4 space-y-3">
                          <div className="space-y-2">
                            <Label>Recommendation notes</Label>
                            <textarea
                              className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                              value={offerNotes}
                              onChange={(event) => setOfferNotes(event.target.value)}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              disabled={isPending}
                              onClick={() =>
                                runAction(() =>
                                  submitTeamOfferRecommendationAction({
                                    offerId: offer.id,
                                    recommendation: "approve",
                                    notes: offerNotes || undefined,
                                  }),
                                )
                              }
                            >
                              Recommend Approval
                            </Button>
                            <Button
                              variant="outline"
                              disabled={isPending}
                              onClick={() =>
                                runAction(() =>
                                  submitTeamOfferRecommendationAction({
                                    offerId: offer.id,
                                    recommendation: "revise",
                                    notes: offerNotes || undefined,
                                  }),
                                )
                              }
                            >
                              Recommend Revision
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={isPending}
                              onClick={() =>
                                runAction(() =>
                                  submitTeamOfferRecommendationAction({
                                    offerId: offer.id,
                                    recommendation: "reject",
                                    notes: offerNotes || undefined,
                                  }),
                                )
                              }
                            >
                              Reject Offer
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  title="No offers yet"
                  description="HR will publish offers for your review when ready."
                />
              )}

              <div className="rounded-xl border p-4">
                <h3 className="text-sm font-semibold">Recommend Candidate</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={isPending}
                    onClick={() =>
                      runAction(() =>
                        recommendTeamCandidateAction({
                          candidateId: profile.id,
                          recommendation: "offer",
                        }),
                      )
                    }
                  >
                    Recommend Offer
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isPending || rejectReason.trim().length < 3}
                    onClick={() =>
                      runAction(() =>
                        rejectTeamCandidateAction({
                          candidateId: profile.id,
                          reason: rejectReason,
                        }),
                      )
                    }
                  >
                    Recommend Rejection
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  <Label>Rejection reason</Label>
                  <Input
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Required for rejection"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
