"use client";

import { format, parseISO } from "date-fns";
import { FileUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { GoalStatusBadge, ReviewStatusBadge } from "@/components/performance/performance-status-badge";
import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createTeamPerformanceFeedbackAction,
  createTeamPerformanceGoalAction,
  createTeamPerformanceOneOnOneAction,
  createTeamPerformancePromotionAction,
  fetchTeamEmployeePerformanceProfileAction,
  saveTeamPerformanceReviewDraftAction,
  startTeamPerformanceReviewAction,
  submitTeamPerformanceReviewAction,
  updateTeamGoalProgressAction,
  uploadTeamPerformanceGoalAttachmentAction,
} from "@/lib/manager/actions/manager-performance-actions";
import {
  parseReviewCommentsPayload,
} from "@/lib/manager/services/performance-competency-utils";
import {
  FEEDBACK_TYPE_LABELS,
  RATING_LABELS,
} from "@/lib/performance/constants";
import type { CompetencyRatings, TeamEmployeePerformanceProfile } from "@/types/manager-performance";
import { cn } from "@/lib/utils";

const FEEDBACK_MAX_LENGTH = 1000;

const textareaClassName = cn(
  "min-h-[7rem] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors",
  "placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
);

export type ProfileTab =
  | "overview"
  | "goals"
  | "review"
  | "feedback"
  | "oneOnOne"
  | "recommendations";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "goals", label: "Goals" },
  { id: "review", label: "Review" },
  { id: "feedback", label: "Feedback" },
  { id: "oneOnOne", label: "1:1" },
  { id: "recommendations", label: "Recommendations" },
];

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

type ManagerPerformanceProfileDrawerProps = {
  employeeId: string | null;
  initialTab?: ProfileTab;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managerEmployeeId: string;
  onActionComplete?: () => void;
};

export function ManagerPerformanceProfileDrawer({
  employeeId,
  initialTab = "overview",
  open,
  onOpenChange,
  managerEmployeeId,
  onActionComplete,
}: ManagerPerformanceProfileDrawerProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [profile, setProfile] = useState<TeamEmployeePerformanceProfile | null>(null);
  const [isLoading, startLoading] = useTransition();
  const [isPending, startAction] = useTransition();

  const [goalForm, setGoalForm] = useState({
    title: "",
    description: "",
  });
  const goalFileInputRef = useRef<HTMLInputElement>(null);
  const [goalPdfName, setGoalPdfName] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState({
    feedbackType: "appreciation",
    message: "",
    visibility: "private",
  });
  const [oneOnOneForm, setOneOnOneForm] = useState({
    meetingDate: "",
    meetingTime: "",
    agenda: "",
  });
  const [promotionForm, setPromotionForm] = useState({ reason: "" });
  const [reviewForm, setReviewForm] = useState({
    overallRating: "3",
    strengths: "",
    weaknesses: "",
    improvementPlan: "",
    managerNotes: "",
    competencies: {} as CompetencyRatings,
    recommendPromotion: false,
    recommendTraining: false,
    recommendPip: false,
  });

  useEffect(() => {
    if (!open || !employeeId) return;
    setActiveTab(initialTab);
    setProfile(null);
    startLoading(async () => {
      const data = await fetchTeamEmployeePerformanceProfileAction(employeeId);
      setProfile(data);
      if (data?.activeReview) {
        const parsed = parseReviewCommentsPayload(data.activeReview.comments);
        setReviewForm({
          overallRating: String(data.activeReview.overallRating ?? 3),
          strengths: data.activeReview.strengths ?? "",
          weaknesses: data.activeReview.weaknesses ?? "",
          improvementPlan: data.activeReview.improvementPlan ?? "",
          managerNotes: parsed.rawNotes ?? "",
          competencies: parsed.competencies ?? {},
          recommendPromotion: Boolean(parsed.recommendPromotion),
          recommendTraining: Boolean(parsed.recommendTraining),
          recommendPip: Boolean(parsed.recommendPip),
        });
      }
    });
  }, [open, employeeId, initialTab]);

  function refreshProfile() {
    if (!employeeId) return;
    startLoading(async () => {
      const data = await fetchTeamEmployeePerformanceProfileAction(employeeId);
      setProfile(data);
    });
    onActionComplete?.();
  }

  function handleCreateGoal() {
    if (!employeeId || !goalForm.title.trim()) return;

    startAction(async () => {
      let attachmentPath: string | null = null;
      const pdfFile = goalFileInputRef.current?.files?.[0];

      if (pdfFile) {
        const formData = new FormData();
        formData.append("file", pdfFile);
        const uploadResult = await uploadTeamPerformanceGoalAttachmentAction(formData);
        if (!uploadResult.success) {
          toast.error(uploadResult.message);
          return;
        }
        attachmentPath = uploadResult.data;
      }

      const result = await createTeamPerformanceGoalAction({
        employeeId,
        title: goalForm.title.trim(),
        description: goalForm.description.trim() || undefined,
        attachmentPath,
        weightage: 0,
        dueDate: null,
        goalStatus: "not_started",
        goalPriority: "medium",
        currentProgress: 0,
      });

      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        setGoalForm({ title: "", description: "" });
        setGoalPdfName(null);
        if (goalFileInputRef.current) goalFileInputRef.current.value = "";
        refreshProfile();
      }
    });
  }

  function handleGoalProgress(goalId: string, progress: number, goalStatus: string) {
    startAction(async () => {
      const result = await updateTeamGoalProgressAction({
        goalId,
        currentProgress: progress,
        goalStatus,
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        refreshProfile();
      }
    });
  }

  function handleStartReview() {
    if (!employeeId) return;
    startAction(async () => {
      const result = await startTeamPerformanceReviewAction({ employeeId });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        refreshProfile();
      }
    });
  }

  function handleSaveReviewDraft() {
    if (!profile?.activeReview) return;
    startAction(async () => {
      const result = await saveTeamPerformanceReviewDraftAction({
        reviewId: profile.activeReview!.id,
        overallRating: Number(reviewForm.overallRating),
        strengths: reviewForm.strengths,
        weaknesses: reviewForm.weaknesses,
        improvementPlan: reviewForm.improvementPlan,
        managerNotes: reviewForm.managerNotes,
        competencies: reviewForm.competencies,
        recommendPromotion: reviewForm.recommendPromotion,
        recommendTraining: reviewForm.recommendTraining,
        recommendPip: reviewForm.recommendPip,
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        refreshProfile();
      }
    });
  }

  function handleSubmitReview() {
    if (!profile?.activeReview) return;
    startAction(async () => {
      const result = await submitTeamPerformanceReviewAction({
        reviewId: profile.activeReview!.id,
        overallRating: Number(reviewForm.overallRating),
        strengths: reviewForm.strengths,
        weaknesses: reviewForm.weaknesses,
        improvementPlan: reviewForm.improvementPlan,
        managerNotes: reviewForm.managerNotes,
        competencies: reviewForm.competencies,
        recommendPromotion: reviewForm.recommendPromotion,
        recommendTraining: reviewForm.recommendTraining,
        recommendPip: reviewForm.recommendPip,
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        refreshProfile();
      }
    });
  }

  function handleFeedback() {
    if (!employeeId || !feedbackForm.message.trim()) return;
    if (feedbackForm.message.length > FEEDBACK_MAX_LENGTH) {
      toast.error(`Feedback must be ${FEEDBACK_MAX_LENGTH} characters or fewer.`);
      return;
    }

    startAction(async () => {
      const result = await createTeamPerformanceFeedbackAction({
        toEmployeeId: employeeId,
        feedbackType: feedbackForm.feedbackType,
        visibility: feedbackForm.visibility,
        message: feedbackForm.message.trim(),
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        setFeedbackForm({ feedbackType: "appreciation", message: "", visibility: "private" });
        refreshProfile();
      }
    });
  }

  function handleOneOnOne() {
    if (!employeeId || !oneOnOneForm.meetingDate || !oneOnOneForm.meetingTime) {
      toast.error("Select a meeting date and time.");
      return;
    }

    const scheduledAt = `${oneOnOneForm.meetingDate}T${oneOnOneForm.meetingTime}:00`;

    startAction(async () => {
      const result = await createTeamPerformanceOneOnOneAction({
        employeeId,
        managerEmployeeId,
        scheduledAt,
        agenda: oneOnOneForm.agenda.trim() || undefined,
        meetingStatus: "scheduled",
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        setOneOnOneForm({ meetingDate: "", meetingTime: "", agenda: "" });
        refreshProfile();
      }
    });
  }

  function handlePromotion() {
    if (!employeeId) return;
    startAction(async () => {
      const result = await createTeamPerformancePromotionAction({
        employeeId,
        reason: promotionForm.reason || undefined,
      });
      if (!result.success) toast.error(result.message);
      else {
        toast.success(result.message);
        setPromotionForm({ reason: "" });
        refreshProfile();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>
            {profile ? `${profile.employeeName} · Performance` : "Employee performance"}
          </DialogTitle>
        </DialogHeader>

        {isLoading && !profile ? (
          <div className="flex min-h-[20rem] flex-1 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !profile ? (
          <div className="p-6">
            <EmptyState title="Profile not found" description="This employee could not be loaded." />
          </div>
        ) : (
          <>
            <div className="border-b px-6 py-3">
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => (
                  <Button
                    key={tab.id}
                    size="sm"
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
              {activeTab === "overview" ? (
                <>
                  <section className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                    <DetailField label="Employee" value={profile.employeeName} />
                    <DetailField label="Employee ID" value={profile.employeeCode} />
                    <DetailField label="Department" value={profile.departmentName ?? "—"} />
                    <DetailField label="Designation" value={profile.designationTitle ?? "—"} />
                    <DetailField label="Reporting Manager" value={profile.managerName ?? "—"} />
                    <DetailField
                      label="Joining Date"
                      value={
                        profile.dateOfJoining
                          ? format(parseISO(profile.dateOfJoining), "d MMM yyyy")
                          : "—"
                      }
                    />
                    <DetailField
                      label="Current Rating"
                      value={
                        profile.currentRating
                          ? RATING_LABELS[profile.currentRating as keyof typeof RATING_LABELS] ??
                            `${profile.currentRating}/5`
                          : "—"
                      }
                    />
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold">Historical Ratings</h3>
                    <div className="space-y-2">
                      {profile.historicalRatings.length ? (
                        profile.historicalRatings.map((item) => (
                          <div
                            key={item.reviewId}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          >
                            <div>
                              <p className="font-medium">{item.cycleName ?? "Review"}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.submittedAt
                                  ? format(parseISO(item.submittedAt), "d MMM yyyy")
                                  : "—"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <ReviewStatusBadge status={item.reviewStatus} />
                              <span>{item.rating ?? "—"}/5</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No review history yet.</p>
                      )}
                    </div>
                  </section>

                  <section className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Achievements</h3>
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {profile.achievements.length
                          ? profile.achievements.map((item) => <li key={item}>{item}</li>)
                          : "No achievements recorded yet."}
                      </ul>
                    </div>
                    <div>
                      <h3 className="mb-2 text-sm font-semibold">Improvement Areas</h3>
                      <ul className="list-inside list-disc text-sm text-muted-foreground">
                        {profile.improvementAreas.length
                          ? profile.improvementAreas.map((item) => <li key={item}>{item}</li>)
                          : "No improvement areas recorded yet."}
                      </ul>
                    </div>
                  </section>
                </>
              ) : null}

              {activeTab === "goals" ? (
                <>
                  <section className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Assign Goal</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="goal-title">Goal title</Label>
                        <Input
                          id="goal-title"
                          value={goalForm.title}
                          onChange={(event) =>
                            setGoalForm((current) => ({ ...current, title: event.target.value }))
                          }
                          placeholder="e.g. Complete Q3 deliverables"
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="goal-description">Goal details</Label>
                        <textarea
                          id="goal-description"
                          value={goalForm.description}
                          onChange={(event) =>
                            setGoalForm((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                          placeholder="Describe what the employee should achieve, milestones, and expectations..."
                          className={cn(textareaClassName, "mt-1.5 min-h-[10rem]")}
                        />
                      </div>
                      <div>
                        <Label htmlFor="goal-pdf">Attach PDF for employee (optional)</Label>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <input
                            ref={goalFileInputRef}
                            id="goal-pdf"
                            type="file"
                            accept="application/pdf"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0] ?? null;
                              setGoalPdfName(file?.name ?? null);
                            }}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => goalFileInputRef.current?.click()}
                          >
                            <FileUp className="mr-2 size-4" />
                            Upload PDF
                          </Button>
                          {goalPdfName ? (
                            <span className="text-xs text-muted-foreground">{goalPdfName}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">PDF up to 15 MB</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" disabled={isPending} onClick={handleCreateGoal}>
                      Assign goal
                    </Button>
                  </section>

                  <section className="space-y-3">
                    {profile.goals.length ? (
                      profile.goals.map((goal) => (
                        <div key={goal.id} className="rounded-lg border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{goal.title}</p>
                              {goal.description ? (
                                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                  {goal.description}
                                </p>
                              ) : null}
                              {goal.attachmentPath ? (
                                <p className="mt-2 text-xs font-medium text-primary">
                                  PDF attached for employee
                                </p>
                              ) : null}
                            </div>
                            <GoalStatusBadge status={goal.goalStatus} />
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Progress: {goal.currentProgress}%
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() =>
                                handleGoalProgress(goal.id, 100, "completed")
                              }
                            >
                              Mark completed
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isPending}
                              onClick={() =>
                                handleGoalProgress(goal.id, goal.currentProgress, "at_risk")
                              }
                            >
                              Mark blocked
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No goals assigned" description="Create a goal for this employee." />
                    )}
                  </section>
                </>
              ) : null}

              {activeTab === "review" ? (
                <>
                  {!profile.activeReview ? (
                    <section className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">
                        No active manager review for this employee.
                      </p>
                      <Button className="mt-3" size="sm" disabled={isPending} onClick={handleStartReview}>
                        Start review
                      </Button>
                    </section>
                  ) : (
                    <section className="space-y-4 rounded-lg border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold">Manager Review</h3>
                          <ReviewStatusBadge status={profile.activeReview.reviewStatus} />
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="overall-rating">Overall rating</Label>
                          <Select
                            value={reviewForm.overallRating}
                            onValueChange={(value) =>
                              setReviewForm((current) => ({
                                ...current,
                                overallRating: value ?? "3",
                              }))
                            }
                          >
                            <SelectTrigger id="overall-rating" className="mt-1.5 w-full">
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(RATING_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="review-strengths">Strengths</Label>
                          <textarea
                            id="review-strengths"
                            value={reviewForm.strengths}
                            onChange={(event) =>
                              setReviewForm((current) => ({
                                ...current,
                                strengths: event.target.value,
                              }))
                            }
                            placeholder="What is this employee doing well?"
                            className={cn(textareaClassName, "mt-1.5")}
                          />
                        </div>
                        <div>
                          <Label htmlFor="review-improvements">Areas to improve</Label>
                          <textarea
                            id="review-improvements"
                            value={reviewForm.weaknesses}
                            onChange={(event) =>
                              setReviewForm((current) => ({
                                ...current,
                                weaknesses: event.target.value,
                              }))
                            }
                            placeholder="What should they focus on next?"
                            className={cn(textareaClassName, "mt-1.5")}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Recommendations</Label>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm">
                          {[
                            ["recommendPromotion", "Recommend promotion"],
                            ["recommendTraining", "Recommend training"],
                            ["recommendPip", "Recommend PIP"],
                          ].map(([key, label]) => (
                            <label key={key} className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={reviewForm[key as keyof typeof reviewForm] as boolean}
                                onChange={(event) =>
                                  setReviewForm((current) => ({
                                    ...current,
                                    [key]: event.target.checked,
                                  }))
                                }
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 border-t pt-4">
                        <Button size="sm" variant="outline" disabled={isPending} onClick={handleSaveReviewDraft}>
                          Save draft
                        </Button>
                        <Button size="sm" disabled={isPending} onClick={handleSubmitReview}>
                          Submit review
                        </Button>
                      </div>
                    </section>
                  )}
                </>
              ) : null}

              {activeTab === "feedback" ? (
                <>
                  <section className="space-y-3 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Add Feedback</h3>
                    <div>
                      <Label htmlFor="feedback-message">Message</Label>
                      <textarea
                        id="feedback-message"
                        value={feedbackForm.message}
                        maxLength={FEEDBACK_MAX_LENGTH}
                        onChange={(event) =>
                          setFeedbackForm((current) => ({ ...current, message: event.target.value }))
                        }
                        placeholder="Share appreciation, coaching, or suggestions for this team member..."
                        className={cn(textareaClassName, "mt-1.5 min-h-[9rem]")}
                      />
                      <p className="mt-1.5 text-right text-xs text-muted-foreground tabular-nums">
                        {feedbackForm.message.length}/{FEEDBACK_MAX_LENGTH}
                      </p>
                    </div>
                    <Button size="sm" disabled={isPending} onClick={handleFeedback}>
                      Send feedback
                    </Button>
                  </section>
                  <section className="space-y-2">
                    {profile.feedback.map((item) => (
                      <div key={item.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">
                          {FEEDBACK_TYPE_LABELS[item.feedbackType]} · {item.fromEmployeeName}
                        </p>
                        <p className="mt-1 text-muted-foreground">{item.message}</p>
                      </div>
                    ))}
                  </section>
                </>
              ) : null}

              {activeTab === "oneOnOne" ? (
                <>
                  <section className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Schedule 1:1</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="meeting-date">Meeting date</Label>
                        <Input
                          id="meeting-date"
                          type="date"
                          value={oneOnOneForm.meetingDate}
                          onChange={(event) =>
                            setOneOnOneForm((current) => ({
                              ...current,
                              meetingDate: event.target.value,
                            }))
                          }
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="meeting-time">Meeting time</Label>
                        <Input
                          id="meeting-time"
                          type="time"
                          value={oneOnOneForm.meetingTime}
                          onChange={(event) =>
                            setOneOnOneForm((current) => ({
                              ...current,
                              meetingTime: event.target.value,
                            }))
                          }
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="meeting-agenda">Agenda (optional)</Label>
                      <textarea
                        id="meeting-agenda"
                        value={oneOnOneForm.agenda}
                        onChange={(event) =>
                          setOneOnOneForm((current) => ({ ...current, agenda: event.target.value }))
                        }
                        placeholder="What would you like to discuss?"
                        className={cn(textareaClassName, "mt-1.5 min-h-[5rem]")}
                      />
                    </div>
                    <Button size="sm" disabled={isPending} onClick={handleOneOnOne}>
                      Schedule meeting
                    </Button>
                  </section>
                  <section className="space-y-2">
                    {profile.oneOnOnes.map((item) => (
                      <div key={item.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">
                          {format(parseISO(item.scheduledAt), "d MMM yyyy, h:mm a")}
                        </p>
                        <p className="text-muted-foreground">{item.agenda ?? "No agenda"}</p>
                      </div>
                    ))}
                  </section>
                </>
              ) : null}

              {activeTab === "recommendations" ? (
                <section className="space-y-4 rounded-lg border p-4">
                  <h3 className="text-sm font-semibold">Promotion Recommendation</h3>
                  <Input
                    value={promotionForm.reason}
                    onChange={(event) =>
                      setPromotionForm({ reason: event.target.value })
                    }
                    placeholder="Reason for promotion recommendation"
                  />
                  <Button size="sm" disabled={isPending} onClick={handlePromotion}>
                    Recommend promotion
                  </Button>

                  <div className="space-y-2 border-t pt-4">
                    {profile.promotions.map((item) => (
                      <div key={item.id} className="rounded-lg border p-3 text-sm">
                        <p className="font-medium">
                          {item.recommendedDesignation ?? "Promotion"} · {item.promotionStatus}
                        </p>
                        <p className="text-muted-foreground">{item.reason ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
