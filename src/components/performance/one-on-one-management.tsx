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
import { OneOnOneDetailModal } from "@/components/performance/one-on-one-detail-modal";
import { MeetingStatusBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
} from "@/components/performance/performance-ui-primitives";
import { EmployeeSelect } from "@/components/payroll/payroll-select";
import { createOneOnOneAction } from "@/lib/performance/actions";
import { MEETING_STATUS_LABELS } from "@/lib/performance/constants";
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

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium">Schedule 1:1 meeting</h2>
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
        <Field label="Manager">
          <EmployeeSelect
            employees={employees}
            value={form.watch("managerEmployeeId")}
            onValueChange={(v) => form.setValue("managerEmployeeId", v, { shouldValidate: true })}
            disabled={isPending}
          />
        </Field>
        <Field label="Scheduled at">
          <Input type="datetime-local" disabled={isPending} {...form.register("scheduledAt")} />
        </Field>
        <Field label="Follow-up date">
          <Input type="date" disabled={isPending} {...form.register("followUpDate")} />
        </Field>
        <Field label="Agenda" className="md:col-span-2">
          <Input disabled={isPending} {...form.register("agenda")} placeholder="Meeting agenda" />
        </Field>
        <Field label="Notes" className="md:col-span-2">
          <Input disabled={isPending} {...form.register("notes")} placeholder="Pre-meeting notes" />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Schedule meeting
          </Button>
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
}: {
  records: OneOnOneListItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  employeeId?: string;
  meetingStatus?: string;
  canEdit?: boolean;
}) {
  const [viewId, setViewId] = useState<string | null>(null);

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

      <OneOnOneDetailModal
        meetingId={viewId}
        open={!!viewId}
        onOpenChange={(open) => !open && setViewId(null)}
        canEdit={canEdit}
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
