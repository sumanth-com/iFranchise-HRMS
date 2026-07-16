"use client";

import { format } from "date-fns";
import { Loader2, Mail, Target, TrendingUp, UserRound } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
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
import { cn } from "@/lib/utils";

type CeoPerformanceDrawerProps = {
  employeeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm font-medium break-words">{value || "—"}</span>
    </div>
  );
}

function SnapshotTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex min-h-[4.25rem] flex-col justify-between rounded-lg border bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className={cn("text-lg font-semibold tabular-nums", accent)}>{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function isReviewStatus(status: string): status is ReviewStatus {
  return ["draft", "pending", "in_progress", "submitted", "approved", "rejected"].includes(
    status,
  );
}

function PerformanceDetail({ detail }: { detail: CeoPerformanceEmployeeDetail }) {
  const avgGoalProgress =
    detail.goals.length > 0
      ? detail.goals.reduce((sum, goal) => sum + goal.progress, 0) / detail.goals.length
      : null;

  const hasRatings =
    detail.quarterRatings.some((item) => item.value != null) ||
    detail.yearlyRatings.some((item) => item.value != null);

  const hasDevelopment =
    detail.strengths.length > 0 ||
    detail.improvementAreas.length > 0 ||
    detail.skills.length > 0 ||
    detail.achievements.length > 0;

  return (
    <div className="space-y-4 pb-2">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <EmployeeAvatar
            firstName={detail.firstName}
            lastName={detail.lastName}
            profileImagePath={detail.profileImagePath}
            className="size-14 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold leading-tight">{detail.fullName}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {detail.employeeCode}
              {detail.designationTitle ? ` · ${detail.designationTitle}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {isReviewStatus(detail.currentStatus) ? (
                <ReviewStatusBadge status={detail.currentStatus} />
              ) : (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                  {detail.currentStatus || "No review"}
                </span>
              )}
              {detail.onPip ? (
                <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                  On PIP
                </span>
              ) : null}
              {detail.currentRating != null ? (
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  {detail.currentRating.toFixed(1)} ·{" "}
                  {RATING_LABELS[Math.round(detail.currentRating)] ?? "Rated"}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <SnapshotTile
          label="Rating"
          value={detail.currentRating != null ? detail.currentRating.toFixed(1) : "—"}
          accent={
            detail.currentRating != null && detail.currentRating >= 4
              ? "text-emerald-600 dark:text-emerald-400"
              : undefined
          }
        />
        <SnapshotTile
          label="Review"
          value={
            isReviewStatus(detail.currentStatus)
              ? detail.currentStatus.replace("_", " ")
              : detail.currentStatus || "—"
          }
          accent={
            detail.currentStatus === "pending" || detail.currentStatus === "in_progress"
              ? "text-amber-700 dark:text-amber-400 capitalize"
              : "capitalize"
          }
        />
        <SnapshotTile
          label="Goals"
          value={avgGoalProgress != null ? formatCeoPercent(avgGoalProgress) : "—"}
        />
        <SnapshotTile
          label="Active Goals"
          value={String(detail.goals.length)}
        />
      </div>

      <Section title="Profile">
        <InfoRow label="Department" value={detail.departmentName} />
        <InfoRow label="Designation" value={detail.designationTitle} />
        <InfoRow label="Manager" value={detail.managerName} />
        {detail.email ? (
          <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2.5 last:border-0">
            <span className="shrink-0 text-xs text-muted-foreground">Email</span>
            <a
              href={`mailto:${detail.email}`}
              className="inline-flex min-w-0 items-center gap-1.5 text-right text-sm font-medium text-primary hover:underline"
            >
              <Mail className="size-3.5 shrink-0" />
              <span className="break-all">{detail.email}</span>
            </a>
          </div>
        ) : (
          <InfoRow label="Email" value={null} />
        )}
      </Section>

      {detail.timeline.length > 0 ? (
        <Section title="Review Timeline">
          <ol className="space-y-3">
            {detail.timeline.map((event) => (
              <li
                key={event.id}
                className="rounded-lg border bg-background/80 px-3 py-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{event.title}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {format(new Date(event.createdAt), "d MMM yyyy")}
                  </span>
                </div>
                {event.description ? (
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {event.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {detail.goals.length > 0 ? (
        <Section title="Goals">
          <ul className="space-y-2">
            {detail.goals.map((goal) => (
              <li
                key={goal.id}
                className="rounded-lg border bg-background/80 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium">{goal.title}</p>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatCeoPercent(goal.progress)}
                  </span>
                </div>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {goal.status.replace("_", " ")}
                  {goal.dueDate
                    ? ` · due ${format(new Date(goal.dueDate), "d MMM yyyy")}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {hasRatings ? (
        <Section title="Ratings">
          <div className="grid gap-4 sm:grid-cols-2">
            {detail.quarterRatings.some((item) => item.value != null) ? (
              <div>
                <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Quarterly
                </p>
                <ul className="space-y-1.5">
                  {detail.quarterRatings.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium tabular-nums">
                        {item.value != null ? item.value.toFixed(1) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {detail.yearlyRatings.some((item) => item.value != null) ? (
              <div>
                <p className="mb-2 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Yearly
                </p>
                <ul className="space-y-1.5">
                  {detail.yearlyRatings.map((item) => (
                    <li
                      key={item.label}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium tabular-nums">
                        {item.value != null ? item.value.toFixed(1) : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {detail.managerFeedback.length > 0 ? (
        <Section title="Manager Feedback">
          <ul className="space-y-2">
            {detail.managerFeedback.map((item) => (
              <li
                key={item.id}
                className="rounded-lg border bg-background/80 px-3 py-2.5 text-sm"
              >
                <p className="font-medium">
                  {item.fromName} ·{" "}
                  {FEEDBACK_TYPE_LABELS[item.feedbackType as FeedbackType] ??
                    item.feedbackType}
                </p>
                <p className="mt-1 leading-relaxed text-muted-foreground">{item.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(item.createdAt), "d MMM yyyy")}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {detail.promotionHistory.length > 0 ? (
        <Section title="Promotions">
          <ul className="space-y-2">
            {detail.promotionHistory.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-lg border bg-background/80 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {item.fromTitle ?? "Current"} → {item.toTitle ?? "Recommended"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {format(new Date(item.createdAt), "d MMM yyyy")}
                  </p>
                </div>
                <PromotionStatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {hasDevelopment ? (
        <Section title="Development">
          {detail.strengths.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="size-3.5" />
                Strengths
              </p>
              <ul className="space-y-1 text-sm">
                {detail.strengths.map((item) => (
                  <li key={item} className="rounded-md bg-emerald-500/5 px-2 py-1">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {detail.improvementAreas.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Target className="size-3.5" />
                Improvement Areas
              </p>
              <ul className="space-y-1 text-sm">
                {detail.improvementAreas.map((item) => (
                  <li key={item} className="rounded-md bg-amber-500/5 px-2 py-1">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {detail.skills.length > 0 ? (
            <ul className="space-y-1.5">
              {detail.skills.map((skill) => (
                <li
                  key={skill.label}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>{skill.label}</span>
                  <span className="font-medium tabular-nums">{skill.value}/5</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
      ) : null}

      {detail.awards.length > 0 ? (
        <Section title="Awards">
          <ul className="space-y-2 text-sm">
            {detail.awards.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border bg-background/80 px-3 py-2"
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.awardedAt), "d MMM yyyy")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserRound className="size-3.5 shrink-0" />
        View-only access. Reviews and ratings cannot be edited from the CEO portal.
      </p>
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
      <SheetContent className="flex w-full flex-col overflow-hidden p-0 sm:max-w-lg">
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>Employee Performance</SheetTitle>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-6 py-4">
          {isPending ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading profile…
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-destructive">{error}</p>
          ) : detail ? (
            <PerformanceDetail detail={detail} />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
