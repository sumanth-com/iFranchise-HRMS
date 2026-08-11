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
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  buildStatusItems,
  PerformanceFilters,
  PerformancePagination,
} from "@/components/performance/performance-filters";
import { OneOnOneDetailModal } from "@/components/performance/one-on-one-detail-modal";
import { PerformanceConfirmModal } from "@/components/performance/performance-confirm-modal";
import { MeetingStatusBadge } from "@/components/performance/performance-status-badge";
import {
  DeleteIconButton,
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import { EmployeeSelect } from "@/components/payroll/payroll-select";
import { createOneOnOneAction, deleteOneOnOneAction } from "@/lib/performance/actions";
import { MEETING_STATUS_LABELS } from "@/lib/performance/constants";
import {
  getMinDateTimeLocalValue,
  getMinFollowUpDateLocal,
} from "@/lib/performance/services/performance-utils";
import { oneOnOneFormSchema } from "@/lib/validations/performance";
import type { OneOnOneListItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const statusItems = buildStatusItems(MEETING_STATUS_LABELS);

export function OneOnOneForm({ employees }: { employees: LookupOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof oneOnOneFormSchema>>({
    resolver: zodResolver(oneOnOneFormSchema),
    defaultValues: {
      employeeId: "",
      managerEmployeeId: "",
      scheduledAt: "",
      meetingStatus: "scheduled",
      actionItems: [],
    },
  });

  const scheduledAt = form.watch("scheduledAt");
  const minFollowUpDate = getMinFollowUpDateLocal(scheduledAt);

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <form
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createOneOnOneAction(values);
            if (!result.success) toast.error(result.message);
            else {
              toast.success("Meeting scheduled");
              form.reset();
              router.refresh();
            }
          });
        })}
        className="space-y-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-medium">Schedule 1:1 meeting</h2>
          <Button type="submit" className="h-9 w-full shrink-0 sm:w-auto" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Schedule meeting
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
        <Field label="Employee">
          <EmployeeSelect
            employees={employees}
            value={form.watch("employeeId")}
            onValueChange={(v) => form.setValue("employeeId", v, { shouldValidate: true })}
            disabled={isPending}
          />
        </Field>
        <Field label="Manager">
          <EmployeeSelect
            employees={employees}
            value={form.watch("managerEmployeeId")}
            onValueChange={(v) => form.setValue("managerEmployeeId", v, { shouldValidate: true })}
            disabled={isPending}
          />
        </Field>
        <Field label="Scheduled at">
          <Input
            type="datetime-local"
            min={getMinDateTimeLocalValue()}
            disabled={isPending}
            {...form.register("scheduledAt", {
              onChange: (event) => {
                const nextScheduledAt = event.target.value;
                const followUpDate = form.getValues("followUpDate");
                if (
                  followUpDate &&
                  nextScheduledAt &&
                  followUpDate < getMinFollowUpDateLocal(nextScheduledAt)
                ) {
                  form.setValue("followUpDate", "");
                }
              },
            })}
          />
        </Field>
        <Field label="Follow-up date">
          <Input
            type="date"
            min={minFollowUpDate}
            disabled={isPending || !scheduledAt}
            {...form.register("followUpDate")}
          />
        </Field>
        <Field label="Agenda">
          <Input disabled={isPending} {...form.register("agenda")} placeholder="Meeting agenda" />
        </Field>
        <Field label="Meeting link">
          <Input
            disabled={isPending}
            {...form.register("meetingLink")}
            placeholder="https://meet.google.com/..."
          />
        </Field>
        </div>
      </form>
    </section>
  );
}

export function OneOnOneTable({
  records,
  total,
  page,
  pageSize,
  employees,
  employeeId,
  meetingStatus,
  canEdit = false,
  canDelete = false,
}: {
  records: OneOnOneListItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  employeeId?: string;
  meetingStatus?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewId, setViewId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<OneOnOneListItem | null>(null);

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteOneOnOneAction({ meetingId: deleting.id });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Meeting deleted");
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <PerformanceFilters
          employees={employees}
          statusItems={statusItems}
          statusKey="meetingStatus"
          statusValue={meetingStatus}
          employeeId={employeeId}
          searchPlaceholder="Search meetings..."
        />
      </div>
      <PerformanceTableShell
        empty={
          <EmptyState
            title="No meetings scheduled"
            description="Schedule a 1:1 to discuss progress and action items."
            className="border-0"
          />
        }
      >
        {records.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Manager</th>
                <th className="px-4 py-3 font-medium">Scheduled</th>
                <th className="px-4 py-3 font-medium">Agenda</th>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Follow-up</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3">{row.employeeName}</td>
                  <td className="px-4 py-3">{row.managerName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {format(new Date(row.scheduledAt), "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="line-clamp-2">{row.agenda ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.completedActions}/{row.actionItemCount}
                  </td>
                  <td className="px-4 py-3">
                    <MeetingStatusBadge status={row.meetingStatus} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.followUpDate ? format(new Date(row.followUpDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <ViewIconButton onClick={() => setViewId(row.id)} />
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

      <OneOnOneDetailModal
        meetingId={viewId}
        open={!!viewId}
        onOpenChange={(open) => !open && setViewId(null)}
        canEdit={canEdit}
      />

      <PerformanceConfirmModal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this meeting?"
        description="The employee will no longer see this scheduled 1:1."
        confirmLabel="Delete meeting"
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
