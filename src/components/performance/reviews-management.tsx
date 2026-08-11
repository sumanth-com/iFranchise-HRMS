"use client";

import { format } from "date-fns";
import { Eye, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { ReviewDetailModal } from "@/components/performance/review-detail-modal";
import {
  buildStatusItems,
  PerformanceFilters,
  PerformancePagination,
} from "@/components/performance/performance-filters";
import {
  ReviewStageBadge,
  ReviewStatusBadge,
} from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
} from "@/components/performance/performance-ui-primitives";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { createReviewAction } from "@/lib/performance/actions";
import {
  REVIEW_STAGE_LABELS,
  REVIEW_STATUS_LABELS,
} from "@/lib/performance/constants";
import { reviewFormSchema } from "@/lib/validations/performance";
import type { ReviewListItem } from "@/types/performance";
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
      <h2 className="mb-1 text-sm font-semibold">Initiate performance review</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Start a review cycle for an employee. Approvals run through self → manager → HR → final.
      </p>
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
            items={[
              { value: "", label: "No cycle" },
              ...cycles.map((c) => ({ value: c.id, label: c.label })),
            ]}
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
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Start review
          </Button>
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
  initialReviewId,
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
  initialReviewId?: string;
}) {
  const [viewId, setViewId] = useState<string | null>(initialReviewId ?? null);

  useEffect(() => {
    if (initialReviewId) setViewId(initialReviewId);
  }, [initialReviewId]);

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

      <PerformanceTableShell
        empty={
          <EmptyState
            title="No reviews found"
            description="Initiate a review to start the approval workflow."
            className="border-0"
          />
        }
      >
        {records.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Cycle</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Rating</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.employeeName}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.departmentName ?? row.employeeCode}
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.cycleName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <ReviewStageBadge stage={row.reviewStage} />
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.overallRating ? `${row.overallRating}/5` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <ReviewStatusBadge status={row.reviewStatus} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(row.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <Button size="sm" variant="outline" onClick={() => setViewId(row.id)}>
                        <Eye className="mr-1 size-3.5" />
                        View
                      </Button>
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </PerformanceTableShell>

      <PerformancePagination page={page} pageSize={pageSize} total={total} />

      <ReviewDetailModal
        reviewId={viewId}
        open={!!viewId}
        onOpenChange={(open) => !open && setViewId(null)}
        canApprove={canApprove}
      />
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
