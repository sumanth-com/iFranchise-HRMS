"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { formatCeoCurrency, formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import {
  PromotionStatusBadge,
  ReviewStatusBadge,
} from "@/components/performance/performance-status-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchCeoPerformanceEmployeeDetailAction } from "@/lib/ceo/actions/ceo-performance-actions";
import { FEEDBACK_TYPE_LABELS, RATING_LABELS } from "@/lib/performance/constants";
import type { FeedbackType, ReviewStatus } from "@/types/performance";
import type { CeoPerformanceEmployeeDetail } from "@/types/ceo-performance";

type CeoPerformanceDrawerProps = {
  employeeId: string | null;
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

export function CeoPerformanceDrawer({
  employeeId,
  open,
  onOpenChange,
}: CeoPerformanceDrawerProps) {
  const [detail, setDetail] = useState<CeoPerformanceEmployeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !employeeId) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await fetchCeoPerformanceEmployeeDetailAction(employeeId);
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, employeeId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Employee Performance</SheetTitle>
        </SheetHeader>

        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading profile…
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        ) : detail ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <EmployeeAvatar
                firstName={detail.firstName}
                lastName={detail.lastName}
                profileImagePath={detail.profileImagePath}
                className="size-14"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{detail.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {detail.employeeCode}
                  {detail.designationTitle ? ` · ${detail.designationTitle}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {detail.currentRating != null ? (
                    <span className="text-xs font-medium">
                      {detail.currentRating.toFixed(1)} ·{" "}
                      {RATING_LABELS[Math.round(detail.currentRating)] ?? "Rated"}
                    </span>
                  ) : null}
                  {detail.onPip ? (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      On PIP
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Department" value={detail.departmentName} />
              <Field label="Designation" value={detail.designationTitle} />
              <Field label="Manager" value={detail.managerName} />
              <Field label="Current Status" value={detail.currentStatus} />
              <Field
                label="Current Rating"
                value={
                  detail.currentRating != null
                    ? detail.currentRating.toFixed(1)
                    : null
                }
              />
              <Field label="Email" value={detail.email} />
            </div>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Performance Timeline</h3>
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
                        {format(new Date(event.createdAt), "d MMM yyyy")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Quarter Ratings</h3>
              {detail.quarterRatings.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No quarterly ratings.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {detail.quarterRatings.map((item) => (
                    <li key={item.label} className="flex justify-between gap-2">
                      <span>{item.label}</span>
                      <span className="tabular-nums">
                        {item.value != null ? item.value.toFixed(1) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Yearly Ratings</h3>
              {detail.yearlyRatings.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No yearly ratings.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {detail.yearlyRatings.map((item) => (
                    <li key={item.label} className="flex justify-between gap-2">
                      <span>{item.label}</span>
                      <span className="tabular-nums">
                        {item.value != null ? item.value.toFixed(1) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Goal Progress</h3>
              {detail.goals.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No goals recorded.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.goals.map((goal) => (
                    <li key={goal.id} className="text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{goal.title}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatCeoPercent(goal.progress)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {goal.status}
                        {goal.dueDate
                          ? ` · due ${format(new Date(goal.dueDate), "d MMM yyyy")}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Achievements</h3>
              {detail.achievements.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No achievements recorded.</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                  {detail.achievements.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Skills</h3>
              {detail.skills.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No competency ratings recorded.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {detail.skills.map((skill) => (
                    <li key={skill.label} className="flex justify-between gap-2">
                      <span>{skill.label}</span>
                      <span className="tabular-nums">{skill.value}/5</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Strengths</h3>
              {detail.strengths.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No strengths recorded.</p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                  {detail.strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Improvement Areas</h3>
              {detail.improvementAreas.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No improvement areas recorded.
                </p>
              ) : (
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                  {detail.improvementAreas.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Manager Feedback</h3>
              {detail.managerFeedback.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No feedback yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.managerFeedback.map((item) => (
                    <li key={item.id} className="rounded-lg border px-3 py-2 text-sm">
                      <p className="font-medium">
                        {item.fromName} ·{" "}
                        {FEEDBACK_TYPE_LABELS[item.feedbackType as FeedbackType] ??
                          item.feedbackType}
                      </p>
                      <p className="mt-1 text-muted-foreground">{item.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {format(new Date(item.createdAt), "d MMM yyyy")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Promotion History</h3>
              {detail.promotionHistory.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No promotion history.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.promotionHistory.map((item) => (
                    <li key={item.id} className="flex items-start justify-between gap-2 text-sm">
                      <div>
                        <p className="font-medium">
                          {item.fromTitle ?? "Current"} → {item.toTitle ?? "Recommended"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "d MMM yyyy")}
                        </p>
                      </div>
                      <PromotionStatusBadge status={item.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Training History</h3>
              {detail.trainingHistory.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No training recommendations recorded.
                </p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {detail.trainingHistory.map((item) => (
                    <li key={item.id}>
                      <p className="font-medium">{item.title}</p>
                      {item.description ? (
                        <p className="text-muted-foreground">{item.description}</p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.createdAt), "d MMM yyyy")}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Awards</h3>
              {detail.awards.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No performance awards.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {detail.awards.map((item) => (
                    <li key={item.id} className="flex justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.awardedAt), "d MMM yyyy")}
                        </p>
                      </div>
                      <span className="tabular-nums">
                        {item.amount != null ? formatCeoCurrency(item.amount) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {detail.currentStatus &&
            ["draft", "pending", "in_progress", "submitted", "approved", "rejected"].includes(
              detail.currentStatus,
            ) ? (
              <div>
                <ReviewStatusBadge status={detail.currentStatus as ReviewStatus} />
              </div>
            ) : null}

            <p className="text-xs text-muted-foreground">
              CEO access is view-only. Reviews, ratings, and promotions cannot be edited
              from this portal.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
