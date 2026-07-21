"use client";

import { format } from "date-fns";
import { Loader2, Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { KpiStatusBadge } from "@/components/performance/performance-status-badge";
import { PerformancePagination } from "@/components/performance/performance-filters";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import {
  updateKpiProgressAction,
} from "@/lib/performance/actions";
import {
  KPI_MEASUREMENT_LABELS,
  KPI_PERIOD_LABELS,
  KPI_STATUS_LABELS,
} from "@/lib/performance/constants";
import { KpiQuickAssign } from "@/components/performance/kpi-quick-assign";
import {
  formatKpiTarget,
} from "@/lib/performance/services/performance-utils";
import {
  kpiProgressSchema,
} from "@/lib/validations/performance";
import type { KpiListItem, KpiTemplateItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const periodItems = toSelectItems(KPI_PERIOD_LABELS);
const statusFilterItems = [
  { value: "all", label: "All statuses" },
  ...toSelectItems(KPI_STATUS_LABELS),
];


type KpiWorkflowProps = {
  departments: LookupOption[];
  designations: LookupOption[];
  employees: LookupOption[];
  templates: KpiTemplateItem[];
  canManageTemplates: boolean;
  canAssign: boolean;
};

export function KpiWorkflow({
  employees,
  templates,
  canManageTemplates,
  canAssign,
}: KpiWorkflowProps) {
  if (!canManageTemplates && !canAssign) return null;

  return (
    <KpiQuickAssign
      employees={employees}
      templates={templates.filter((t) => t.isActive)}
      canAssign={canAssign}
    />
  );
}

type KpiTableProps = {
  records: KpiListItem[];
  total: number;
  page: number;
  pageSize: number;
  departments: LookupOption[];
  designations: LookupOption[];
  search?: string;
  departmentId?: string;
  designationId?: string;
  kpiStatus?: string;
  kpiPeriod?: string;
  canManageKpis: boolean;
  currentEmployeeId: string;
};

export function KpiTable({
  records,
  total,
  page,
  pageSize,
  search = "",
  kpiStatus,
  kpiPeriod,
  canManageKpis,
  currentEmployeeId,
}: KpiTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<KpiListItem | null>(null);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.set("page", "1");
    startTransition(() => router.push(`?${params.toString()}`));
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Search employee or KPI..."
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ search: (e.target as HTMLInputElement).value || undefined });
              }
            }}
          />
          <LabeledSelect
            items={statusFilterItems}
            value={kpiStatus ?? "all"}
            onValueChange={(v) => updateParams({ kpiStatus: v === "all" ? undefined : v })}
            placeholder="Status"
          />
          <LabeledSelect
            items={[{ value: "all", label: "All periods" }, ...periodItems]}
            value={kpiPeriod ?? "all"}
            onValueChange={(v) => updateParams({ kpiPeriod: v === "all" ? undefined : v })}
            placeholder="Review period"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {records.length === 0 ? (
          <EmptyState
            title="No KPI assignments yet"
            description="Pick a template above and assign it to an employee to start tracking."
            className="border-0"
          />
        ) : (
          <div className="max-h-[24rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">KPI</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-t align-middle">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.employeeName}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">{row.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatKpiTarget(row.targetValue, row.measurementType)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${row.completionPercentage}%` }}
                          />
                        </div>
                        <span className="tabular-nums">{row.completionPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <KpiStatusBadge status={row.kpiStatus} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.endDate ? format(new Date(row.endDate), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.kpiStatus !== "completed" &&
                      (canManageKpis || row.managerEmployeeId === currentEmployeeId) ? (
                        <Button size="sm" variant="outline" onClick={() => setEditing(row)}>
                          <Pencil className="mr-1 h-3.5 w-3.5" />
                          Update
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PerformancePagination page={page} pageSize={pageSize} total={total} />

      {editing ? (
        <KpiProgressModal
          record={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </section>
  );
}

function KpiProgressModal({
  record,
  open,
  onOpenChange,
}: {
  record: KpiListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof kpiProgressSchema>>({
    resolver: zodResolver(kpiProgressSchema),
    defaultValues: {
      kpiId: record.id,
      currentValue: record.currentValue,
      progressComments: record.progressComments ?? "",
      evidenceNotes: record.evidenceNotes ?? "",
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Update KPI Progress"
      description={`${record.employeeName} — ${record.title}`}
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await updateKpiProgressAction(values);
              if (!result.success) toast.error(result.message);
              else {
                toast.success("KPI progress updated");
                onOpenChange(false);
                router.refresh();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Progress
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p>
            Target: {formatKpiTarget(record.targetValue, record.measurementType)} · Weightage:{" "}
            {record.weightage}%
          </p>
        </div>
        <Field label={`Current Progress (${KPI_MEASUREMENT_LABELS[record.measurementType]})`}>
          <Input
            type="number"
            min={0}
            step="0.01"
            disabled={isPending}
            {...form.register("currentValue")}
          />
        </Field>
        <Field label="Comments">
          <Input disabled={isPending} placeholder="Manager comments" {...form.register("progressComments")} />
        </Field>
        <Field label="Evidence / Notes">
          <Input disabled={isPending} placeholder="Supporting notes or evidence" {...form.register("evidenceNotes")} />
        </Field>
        <p className="text-xs text-muted-foreground">
          Completion percentage is calculated automatically from the current progress and target.
        </p>
      </div>
    </Modal>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
