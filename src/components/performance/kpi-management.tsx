"use client";

import { format } from "date-fns";
import { ArrowRight, Loader2, Pencil } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
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
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import {
  assignKpiAction,
  createKpiTemplateAction,
  updateKpiProgressAction,
} from "@/lib/performance/actions";
import {
  KPI_MEASUREMENT_LABELS,
  KPI_PERIOD_LABELS,
  KPI_STATUS_LABELS,
} from "@/lib/performance/constants";
import {
  formatKpiProgress,
  formatKpiTarget,
} from "@/lib/performance/services/performance-utils";
import {
  kpiAssignFormSchema,
  kpiProgressSchema,
  kpiTemplateFormSchema,
} from "@/lib/validations/performance";
import type { KpiListItem, KpiTemplateItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const periodItems = toSelectItems(KPI_PERIOD_LABELS);
const measurementItems = toSelectItems(KPI_MEASUREMENT_LABELS);
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
  departments,
  designations,
  employees,
  templates,
  canManageTemplates,
  canAssign,
}: KpiWorkflowProps) {
  if (!canManageTemplates && !canAssign) return null;

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <div className="border-b px-5 py-4">
        <h2 className="text-sm font-medium">KPI Workflow</h2>
        <p className="text-xs text-muted-foreground">
          Create a template once, then assign it to employees. KPI details are inherited automatically.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border px-2.5 py-1">1. Create KPI Template</span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className="rounded-full border px-2.5 py-1">2. Assign to Employees</span>
          <ArrowRight className="h-3.5 w-3.5" />
          <span className="rounded-full border px-2.5 py-1">3. Managers Update Progress</span>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-2 lg:divide-x">
        {canManageTemplates ? (
          <KpiTemplateStep departments={departments} designations={designations} />
        ) : null}
        {canAssign ? (
          <KpiAssignStep employees={employees} templates={templates.filter((t) => t.isActive)} />
        ) : null}
      </div>
    </section>
  );
}

function KpiTemplateStep({
  departments,
  designations,
}: {
  departments: LookupOption[];
  designations: LookupOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof kpiTemplateFormSchema>>({
    resolver: zodResolver(kpiTemplateFormSchema),
    defaultValues: {
      name: "",
      measurementType: "number",
      weightage: 0,
      kpiPeriod: "quarterly",
      isActive: true,
    },
  });

  return (
    <div className="p-5">
      <h3 className="mb-4 text-sm font-medium">Step 1 — Create KPI Template</h3>
      <form
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createKpiTemplateAction(values);
            if (!result.success) toast.error(result.message);
            else {
              toast.success("KPI template saved");
              form.reset({
                name: "",
                measurementType: "number",
                weightage: 0,
                kpiPeriod: "quarterly",
                isActive: true,
              });
              router.refresh();
            }
          });
        })}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="KPI Name" className="sm:col-span-2">
          <Input disabled={isPending} placeholder="e.g. Monthly Sales Target" {...form.register("name")} />
        </Field>
        <Field label="Department">
          <LabeledSelect
            items={[{ value: "", label: "All departments" }, ...departments.map((d) => ({ value: d.id, label: d.label }))]}
            value={form.watch("departmentId") ?? ""}
            onValueChange={(v) => form.setValue("departmentId", v || null)}
            disabled={isPending}
          />
        </Field>
        <Field label="Designation">
          <LabeledSelect
            items={[{ value: "", label: "All designations" }, ...designations.map((d) => ({ value: d.id, label: d.label }))]}
            value={form.watch("designationId") ?? ""}
            onValueChange={(v) => form.setValue("designationId", v || null)}
            disabled={isPending}
          />
        </Field>
        <Field label="Measurement Type">
          <LabeledSelect
            items={measurementItems}
            value={form.watch("measurementType")}
            onValueChange={(v) =>
              form.setValue("measurementType", v as z.input<typeof kpiTemplateFormSchema>["measurementType"])
            }
            disabled={isPending}
          />
        </Field>
        <Field label="Target Value">
          <Input type="number" min={0} step="0.01" disabled={isPending} {...form.register("targetValue")} />
        </Field>
        <Field label="Weightage (%)">
          <Input type="number" min={0} max={100} disabled={isPending} {...form.register("weightage")} />
        </Field>
        <Field label="Review Period">
          <LabeledSelect
            items={periodItems}
            value={form.watch("kpiPeriod")}
            onValueChange={(v) =>
              form.setValue("kpiPeriod", v as z.input<typeof kpiTemplateFormSchema>["kpiPeriod"])
            }
            disabled={isPending}
          />
        </Field>
        <Field label="Description (optional)" className="sm:col-span-2">
          <Input disabled={isPending} placeholder="Optional context for HR and managers" {...form.register("description")} />
        </Field>
        <Field label="Status">
          <LabeledSelect
            items={[
              { value: "true", label: "Active" },
              { value: "false", label: "Inactive" },
            ]}
            value={form.watch("isActive") ? "true" : "false"}
            onValueChange={(v) => form.setValue("isActive", v === "true")}
            disabled={isPending}
          />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Template
          </Button>
        </div>
      </form>
    </div>
  );
}

function KpiAssignStep({
  employees,
  templates,
}: {
  employees: LookupOption[];
  templates: KpiTemplateItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof kpiAssignFormSchema>>({
    resolver: zodResolver(kpiAssignFormSchema),
    defaultValues: { employeeId: "", templateId: "", startDate: "", endDate: "" },
  });

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === form.watch("templateId")),
    [templates, form.watch("templateId")],
  );

  return (
    <div className="p-5">
      <h3 className="mb-4 text-sm font-medium">Step 2 — Assign KPI</h3>
      <form
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await assignKpiAction(values);
            if (!result.success) toast.error(result.message);
            else {
              toast.success("KPI assigned to employee");
              form.reset({ employeeId: "", templateId: "", startDate: "", endDate: "" });
              router.refresh();
            }
          });
        })}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee">
            <EmployeeSelect
              employees={employees}
              value={form.watch("employeeId")}
              onValueChange={(v) => form.setValue("employeeId", v, { shouldValidate: true })}
              disabled={isPending}
            />
          </Field>
          <Field label="KPI Template">
            <LabeledSelect
              items={templates.map((t) => ({ value: t.id, label: t.name }))}
              value={form.watch("templateId")}
              onValueChange={(v) => form.setValue("templateId", v, { shouldValidate: true })}
              placeholder="Select template"
              disabled={isPending || templates.length === 0}
            />
          </Field>
          <Field label="Start Date">
            <Input type="date" disabled={isPending} {...form.register("startDate")} />
          </Field>
          <Field label="End Date">
            <Input type="date" disabled={isPending} {...form.register("endDate")} />
          </Field>
        </div>

        {selectedTemplate ? (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Inherited from template
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <InheritedItem label="KPI Name" value={selectedTemplate.name} />
              <InheritedItem
                label="Target"
                value={formatKpiTarget(selectedTemplate.targetValue, selectedTemplate.measurementType)}
              />
              <InheritedItem label="Weightage" value={`${selectedTemplate.weightage}%`} />
              <InheritedItem
                label="Measurement"
                value={KPI_MEASUREMENT_LABELS[selectedTemplate.measurementType]}
              />
              <InheritedItem label="Review Period" value={KPI_PERIOD_LABELS[selectedTemplate.kpiPeriod]} />
              <InheritedItem
                label="Scope"
                value={[selectedTemplate.departmentName, selectedTemplate.designationTitle]
                  .filter(Boolean)
                  .join(" · ") || "Organization-wide"}
              />
            </dl>
          </div>
        ) : null}

        <Button type="submit" disabled={isPending || templates.length === 0}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Assign KPI
        </Button>
      </form>
    </div>
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
  departments,
  designations,
  search = "",
  departmentId,
  designationId,
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
        <div className="grid gap-3 lg:grid-cols-5">
          <Input
            placeholder="Search employee..."
            defaultValue={search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ search: (e.target as HTMLInputElement).value || undefined });
              }
            }}
          />
          <LabeledSelect
            items={[{ value: "all", label: "All departments" }, ...departments.map((d) => ({ value: d.id, label: d.label }))]}
            value={departmentId ?? "all"}
            onValueChange={(v) => updateParams({ departmentId: v === "all" ? undefined : v })}
            placeholder="Department"
          />
          <LabeledSelect
            items={[{ value: "all", label: "All designations" }, ...designations.map((d) => ({ value: d.id, label: d.label }))]}
            value={designationId ?? "all"}
            onValueChange={(v) => updateParams({ designationId: v === "all" ? undefined : v })}
            placeholder="Designation"
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
            description="Create a template and assign it to employees to start tracking performance."
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">KPI</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Completion</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{row.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3">{row.departmentName ?? "—"}</td>
                    <td className="px-4 py-3">{row.designationTitle ?? "—"}</td>
                    <td className="px-4 py-3 font-medium">{row.title}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatKpiTarget(row.targetValue, row.measurementType)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatKpiProgress(row.currentValue, row.measurementType)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[5rem] items-center gap-2">
                        <div className="h-2 w-14 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${row.completionPercentage}%` }}
                          />
                        </div>
                        <span>{row.completionPercentage}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <KpiStatusBadge status={row.kpiStatus} />
                    </td>
                    <td className="px-4 py-3">{KPI_PERIOD_LABELS[row.kpiPeriod]}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.endDate ? format(new Date(row.endDate), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">{row.managerName ?? "—"}</td>
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

function InheritedItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
