"use client";

import { format } from "date-fns";
import { Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  buildStatusItems,
  PerformanceFilters,
  PerformancePagination,
} from "@/components/performance/performance-filters";
import { FeedbackDetailModal } from "@/components/performance/feedback-detail-modal";
import {
  FeedbackTypeBadge,
  FeedbackVisibilityBadge,
} from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
} from "@/components/performance/performance-ui-primitives";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { createFeedbackAction } from "@/lib/performance/actions";
import { FEEDBACK_TYPE_LABELS, FEEDBACK_VISIBILITY_LABELS } from "@/lib/performance/constants";
import { feedbackFormSchema } from "@/lib/validations/performance";
import type { FeedbackListItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const typeItems = toSelectItems(FEEDBACK_TYPE_LABELS);
const visibilityItems = toSelectItems(FEEDBACK_VISIBILITY_LABELS);
const filterTypeItems = buildStatusItems(FEEDBACK_TYPE_LABELS, "All types");

export function FeedbackForm({ employees }: { employees: LookupOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof feedbackFormSchema>>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: { feedbackType: "appreciation", visibility: "private", message: "", toEmployeeId: "" },
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
              form.reset({ feedbackType: "appreciation", visibility: "private", message: "" });
              router.refresh();
            }
          });
        })}
        className="grid gap-4 md:grid-cols-2"
      >
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
        <Field label="Visibility">
          <LabeledSelect
            items={visibilityItems}
            value={form.watch("visibility")}
            onValueChange={(v) =>
              form.setValue("visibility", v as z.input<typeof feedbackFormSchema>["visibility"])
            }
            disabled={isPending}
          />
        </Field>
        <Field label="Message" className="md:col-span-2">
          <textarea
            className="flex min-h-[5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            placeholder="Your feedback…"
            {...form.register("message")}
          />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send feedback
          </Button>
        </div>
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
}: {
  records: FeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  employeeId?: string;
  feedbackType?: string;
}) {
  const [viewRecord, setViewRecord] = useState<FeedbackListItem | null>(null);

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
                <th className="px-4 py-3 font-medium">Visibility</th>
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
                  <td className="px-4 py-3">
                    <FeedbackVisibilityBadge visibility={row.visibility} />
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="line-clamp-2">{row.message}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(row.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <Button size="sm" variant="outline" onClick={() => setViewRecord(row)}>
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

      <FeedbackDetailModal
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
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
