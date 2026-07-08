"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button, buttonVariants } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  buildStatusItems,
  PerformanceFilters,
  PerformancePagination,
} from "@/components/performance/performance-filters";
import {
  ReviewStageBadge,
  ReviewStatusBadge,
} from "@/components/performance/performance-status-badge";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { approveReviewAction, createReviewAction } from "@/lib/performance/actions";
import {
  PERFORMANCE_ROUTES,
  RATING_LABELS,
  REVIEW_STAGE_LABELS,
  REVIEW_STATUS_LABELS,
} from "@/lib/performance/constants";
import { cn } from "@/lib/utils";
import { reviewFormSchema } from "@/lib/validations/performance";
import type { ReviewDetail, ReviewListItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const stageItems = toSelectItems(REVIEW_STAGE_LABELS);
const statusItems = buildStatusItems(REVIEW_STATUS_LABELS);

export function ReviewForm({
  employees,
  cycles,
}: {
  employees: LookupOption[];
  cycles: LookupOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof reviewFormSchema>>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { employeeId: "", reviewStage: "self" },
  });

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium">Initiate performance review</h2>
      <form
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createReviewAction(values);
            if (!result.success) toast.error(result.message);
            else {
              toast.success("Review initiated");
              form.reset();
              router.refresh();
            }
          });
        })}
        className="grid gap-4 md:grid-cols-2"
      >
        <Field label="Employee">
          <EmployeeSelect
            employees={employees}
            value={form.watch("employeeId")}
            onValueChange={(v) => form.setValue("employeeId", v, { shouldValidate: true })}
            disabled={isPending}
          />
        </Field>
        <Field label="Review cycle">
          <LabeledSelect
            items={[{ value: "", label: "No cycle" }, ...cycles.map((c) => ({ value: c.id, label: c.label }))]}
            value={form.watch("cycleId") ?? ""}
            onValueChange={(v) => form.setValue("cycleId", v || null)}
            disabled={isPending}
          />
        </Field>
        <Field label="Starting stage">
          <LabeledSelect
            items={stageItems}
            value={form.watch("reviewStage")}
            onValueChange={(v) =>
              form.setValue("reviewStage", v as z.input<typeof reviewFormSchema>["reviewStage"])
            }
            disabled={isPending}
          />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>Start review</Button>
        </div>
      </form>
    </section>
  );
}

export function ReviewsTable({
  records,
  total,
  page,
  pageSize,
  employees,
  departments,
  cycles,
  employeeId,
  departmentId,
  cycleId,
  reviewStatus,
  canApprove,
}: {
  records: ReviewListItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  departments: LookupOption[];
  cycles: LookupOption[];
  employeeId?: string;
  departmentId?: string;
  cycleId?: string;
  reviewStatus?: string;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <PerformanceFilters
          employees={employees}
          departments={departments}
          cycles={cycles}
          statusItems={statusItems}
          statusKey="reviewStatus"
          statusValue={reviewStatus}
          employeeId={employeeId}
          departmentId={departmentId}
          cycleId={cycleId}
          searchPlaceholder="Search reviews..."
        />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {records.length === 0 ? (
          <EmptyState title="No reviews found" description="Initiate a review to get started." className="border-0" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Cycle</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{row.departmentName ?? row.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3">{row.cycleName ?? "—"}</td>
                  <td className="px-4 py-3"><ReviewStageBadge stage={row.reviewStage} /></td>
                  <td className="px-4 py-3">
                    {row.overallRating ? `${row.overallRating}/5` : "—"}
                  </td>
                  <td className="px-4 py-3"><ReviewStatusBadge status={row.reviewStatus} /></td>
                  <td className="px-4 py-3">{format(new Date(row.createdAt), "MMM d, yyyy")}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={PERFORMANCE_ROUTES.reviewDetail(row.id)}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        View
                      </Link>
                      {canApprove && ["pending", "in_progress", "submitted"].includes(row.reviewStatus) ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() =>
                            startTransition(async () => {
                              const result = await approveReviewAction({ reviewId: row.id });
                              if (!result.success) toast.error(result.message);
                              else {
                                toast.success("Review step approved");
                                router.refresh();
                              }
                            })
                          }
                        >
                          <CheckCircle2 className="mr-1 h-4 w-4" />
                          Approve
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <PerformancePagination page={page} pageSize={pageSize} total={total} />
    </section>
  );
}

export function ReviewDetailView({ review }: { review: ReviewDetail }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{review.employeeName}</h2>
            <p className="text-sm text-muted-foreground">
              {review.employeeCode} · {review.departmentName ?? "No department"}
            </p>
          </div>
          <div className="flex gap-2">
            <ReviewStageBadge stage={review.reviewStage} />
            <ReviewStatusBadge status={review.reviewStatus} />
          </div>
        </div>
        {review.overallRating ? (
          <p className="mt-4 text-2xl font-semibold">
            {review.overallRating}/5 — {RATING_LABELS[review.overallRating]}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReviewSection title="Strengths" content={review.strengths} />
        <ReviewSection title="Weaknesses" content={review.weaknesses} />
        <ReviewSection title="Improvement plan" content={review.improvementPlan} className="md:col-span-2" />
        <ReviewSection title="Comments" content={review.comments} className="md:col-span-2" />
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-medium">Approval workflow</h3>
        <div className="space-y-3">
          {review.approvals.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
              <div>
                <div className="font-medium">{REVIEW_STAGE_LABELS[a.reviewStage]}</div>
                <div className="text-xs text-muted-foreground">{a.approverName}</div>
              </div>
              <ReviewStatusBadge status={a.approvalStatus === "approved" ? "approved" : a.approvalStatus === "rejected" ? "rejected" : "pending"} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReviewSection({
  title,
  content,
  className,
}: {
  title: string;
  content: string | null;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border bg-card p-5 shadow-sm ${className ?? ""}`}>
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content ?? "—"}</p>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
