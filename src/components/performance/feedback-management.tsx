"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Label } from "@/components/ui/label";
import {
  buildStatusItems,
  PerformanceFilters,
  PerformancePagination,
} from "@/components/performance/performance-filters";
import { FeedbackDetailModal } from "@/components/performance/feedback-detail-modal";
import { PerformanceConfirmModal } from "@/components/performance/performance-confirm-modal";
import { FeedbackTypeBadge } from "@/components/performance/performance-status-badge";
import {
  DeleteIconButton,
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { createFeedbackAction, deleteFeedbackAction } from "@/lib/performance/actions";
import { FEEDBACK_TYPE_LABELS } from "@/lib/performance/constants";
import { feedbackFormSchema } from "@/lib/validations/performance";
import type { FeedbackListItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const typeItems = toSelectItems(FEEDBACK_TYPE_LABELS);
const filterTypeItems = buildStatusItems(FEEDBACK_TYPE_LABELS, "All types");

export function FeedbackForm({ employees }: { employees: LookupOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof feedbackFormSchema>>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: { feedbackType: "appreciation", message: "", toEmployeeId: "" },
  });

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium">Give continuous feedback</h2>
      <form
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createFeedbackAction(values);
            if (!result.success) toast.error(result.message);
            else {
              toast.success("Feedback sent");
              form.reset({ feedbackType: "appreciation", message: "", toEmployeeId: "" });
              router.refresh();
            }
          });
        })}
        className="space-y-4"
      >
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
          <Field label="To employee">
            <EmployeeSelect
              employees={employees}
              value={form.watch("toEmployeeId") ?? ""}
              onValueChange={(v) => form.setValue("toEmployeeId", v, { shouldValidate: true })}
              disabled={isPending}
            />
          </Field>
          <Field label="Feedback type">
            <LabeledSelect
              items={typeItems}
              value={form.watch("feedbackType")}
              onValueChange={(v) =>
                form.setValue("feedbackType", v as z.input<typeof feedbackFormSchema>["feedbackType"])
              }
              disabled={isPending}
            />
          </Field>
          <Button type="submit" className="h-9 w-full shrink-0 md:w-auto" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send feedback
          </Button>
        </div>
        <Field label="Message">
          <textarea
            className="flex min-h-[5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            placeholder="Your feedback…"
            {...form.register("message")}
          />
        </Field>
      </form>
    </section>
  );
}

export function FeedbackTable({
  records,
  total,
  page,
  pageSize,
  employees,
  employeeId,
  feedbackType,
  canDelete = false,
}: {
  records: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  employeeId?: string;
  feedbackType?: string;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewRecord, setViewRecord] = useState<FeedbackListItem | null>(null);
  const [deleting, setDeleting] = useState<FeedbackListItem | null>(null);

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteFeedbackAction({ feedbackId: deleting.id });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Feedback deleted");
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <PerformanceFilters
          employees={employees}
          statusItems={filterTypeItems}
          statusKey="feedbackType"
          statusValue={feedbackType}
          employeeId={employeeId}
          searchPlaceholder="Search feedback..."
        />
      </div>
      <PerformanceTableShell
        empty={
          <EmptyState
            title="No feedback yet"
            description="Start giving appreciation, coaching, or suggestions."
            className="border-0"
          />
        }
      >
        {records.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3">{row.fromEmployeeName}</td>
                  <td className="px-4 py-3">{row.toEmployeeName}</td>
                  <td className="px-4 py-3">
                    <FeedbackTypeBadge type={row.feedbackType} />
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="line-clamp-2">{row.message}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(row.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <ViewIconButton onClick={() => setViewRecord(row)} />
                      {canDelete ? (
                        <DeleteIconButton onClick={() => setDeleting(row)} />
                      ) : null}
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </PerformanceTableShell>
      <PerformancePagination page={page} pageSize={pageSize} total={total} />

      <FeedbackDetailModal
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
      />

      <PerformanceConfirmModal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this feedback?"
        description="The employee will no longer see this message in their profile."
        confirmLabel="Delete feedback"
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
