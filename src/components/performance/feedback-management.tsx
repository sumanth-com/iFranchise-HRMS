"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Label } from "@/components/ui/label";
import {
  buildStatusItems,
  currentMonthValue,
  currentYearValue,
  matchesAssignedPeriod,
  matchesTextQuery,
  MonthYearFilterFields,
  paginateItems,
  PerformanceFilters,
  PerformancePagination,
  type PerformanceFilterUpdates,
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
  pageSize,
  employees,
  canDelete = false,
}: {
  records: FeedbackListItem[];
  total?: number;
  page?: number;
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
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [feedbackType, setFeedbackType] = useState<string | undefined>();
  const [month, setMonth] = useState(currentMonthValue);
  const [year, setYear] = useState(currentYearValue);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return (records ?? []).filter((row) => {
      if (employeeId && row.toEmployeeId !== employeeId) return false;
      if (feedbackType && row.feedbackType !== feedbackType) return false;
      if (!matchesAssignedPeriod(row.createdAt, month, year)) return false;
      return matchesTextQuery(
        [row.fromEmployeeName, row.toEmployeeName, row.message],
        search,
      );
    });
  }, [records, search, employeeId, feedbackType, month, year]);

  const paged = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, employeeId, feedbackType, month, year]);

  useEffect(() => {
    if (page !== paged.page) setPage(paged.page);
  }, [page, paged.page]);

  function handleFiltersChange(updates: PerformanceFilterUpdates) {
    if ("search" in updates) setSearch(updates.search ?? "");
    if ("employeeId" in updates) setEmployeeId(updates.employeeId);
    if ("feedbackType" in updates) setFeedbackType(updates.feedbackType);
    setPage(1);
  }

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
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Feedback history</h2>
        <p className="text-xs text-muted-foreground">
          Latest notes for this month appear first. View and delete stay separate.
        </p>
      </div>
      <PerformanceFilters
        employees={employees}
        statusItems={filterTypeItems}
        statusKey="feedbackType"
        statusValue={feedbackType}
        employeeId={employeeId}
        search={search}
        searchPlaceholder="Search feedback…"
        variant="bar"
        showDepartment={false}
        showCycle={false}
        className="rounded-lg border bg-muted/10 p-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(11rem,1.2fr)_repeat(3,minmax(8rem,1fr))]"
        onFiltersChange={handleFiltersChange}
        extraFilters={
          <MonthYearFilterFields
            month={month}
            year={year}
            onMonthChange={(value) => {
              setMonth(value);
              setPage(1);
            }}
            onYearChange={(value) => {
              setYear(value);
              setPage(1);
            }}
          />
        }
      />
      <PerformanceTableShell
        empty={
          <EmptyState
            title={records.length === 0 ? "No feedback yet" : "No feedback for this period"}
            description={
              records.length === 0
                ? "Start giving appreciation, coaching, or suggestions."
                : "Try another month or year to see more feedback."
            }
            className="border-0 py-8"
          />
        }
      >
        {paged.rows.length > 0 ? (
          <table className="w-full min-w-[52rem] text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="min-w-[14rem] px-4 py-3 font-medium">From</th>
                <th className="min-w-[14rem] px-4 py-3 font-medium">To</th>
                <th className="w-[9rem] px-4 py-3 font-medium">Type</th>
                <th className="w-[40%] max-w-md px-4 py-3 font-medium">Message</th>
                <th className="w-[7.5rem] px-4 py-3 font-medium">Date</th>
                <th className="w-[5.5rem] px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="min-w-[14rem] px-4 py-3 align-middle leading-snug">
                    {row.fromEmployeeName}
                  </td>
                  <td className="min-w-[14rem] px-4 py-3 align-middle leading-snug">
                    {row.toEmployeeName}
                  </td>
                  <td className="w-[9rem] px-4 py-3 align-middle">
                    <FeedbackTypeBadge type={row.feedbackType} />
                  </td>
                  <td className="w-[40%] max-w-md px-4 py-3 align-middle">
                    <span className="line-clamp-2 text-muted-foreground">{row.message}</span>
                  </td>
                  <td className="w-[7.5rem] px-4 py-3 align-middle whitespace-nowrap text-xs">
                    {format(new Date(row.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="w-[5.5rem] px-4 py-3 align-middle">
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
      <PerformancePagination
        page={paged.page}
        pageSize={pageSize}
        total={paged.total}
        onPageChange={setPage}
      />

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
