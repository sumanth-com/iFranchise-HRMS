"use client";

import { Copy, Loader2, Pencil, Plus, UserPlus, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button, buttonVariants } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { RecruitmentPagination } from "@/components/recruitment/recruitment-pagination";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import {
  closeJobOpeningAction,
  createJobOpeningAction,
  duplicateJobOpeningAction,
  updateJobOpeningAction,
} from "@/lib/recruitment/actions";
import {
  JOB_STATUS_LABELS,
  RECRUITMENT_ROUTES,
  WORK_MODE_LABELS,
} from "@/lib/recruitment/constants";
import { DESIGNATION_OTHER_VALUE } from "@/lib/employees/constants";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/recruitment/services/recruitment-utils";
import { jobFormSchema } from "@/lib/validations/recruitment";
import type { JobOpeningItem, RecruitmentLookups } from "@/types/recruitment";

type JobFormInput = z.input<typeof jobFormSchema>;

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

export function JobsManagement({
  records,
  total,
  page,
  pageSize,
  lookups,
  canCreate,
  canEdit,
  filters,
}: {
  records: JobOpeningItem[];
  total: number;
  page: number;
  pageSize: number;
  lookups: RecruitmentLookups;
  canCreate: boolean;
  canEdit: boolean;
  filters: {
    search?: string;
    departmentId?: string;
    jobStatus?: string;
    employmentTypeId?: string;
    location?: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<JobOpeningItem | null>(null);
  const [creating, setCreating] = useState(false);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.set("page", "1");
    startTransition(() => router.push(`?${params.toString()}`));
  }

  async function onDuplicate(id: string) {
    startTransition(async () => {
      const result = await duplicateJobOpeningAction(id);
      if (!result.success) toast.error(result.message);
      else {
        toast.success("Job duplicated as draft");
        router.refresh();
      }
    });
  }

  async function onClose(id: string) {
    startTransition(async () => {
      const result = await closeJobOpeningAction(id);
      if (!result.success) toast.error(result.message);
      else {
        toast.success("Job closed");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Job Openings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage open positions. Set status to Open, then add leads from Candidates.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Job
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-5">
          <Input
            placeholder="Search jobs..."
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ search: (e.target as HTMLInputElement).value || undefined });
              }
            }}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All departments" },
              ...lookups.departments.map((d) => ({ value: d.id, label: d.label })),
            ]}
            value={filters.departmentId ?? "all"}
            onValueChange={(v) => updateParams({ departmentId: v === "all" ? undefined : v })}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All statuses" },
              ...toSelectItems(JOB_STATUS_LABELS),
            ]}
            value={filters.jobStatus ?? "all"}
            onValueChange={(v) => updateParams({ jobStatus: v === "all" ? undefined : v })}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All employment types" },
              ...lookups.employmentTypes.map((d) => ({ value: d.id, label: d.label })),
            ]}
            value={filters.employmentTypeId ?? "all"}
            onValueChange={(v) =>
              updateParams({ employmentTypeId: v === "all" ? undefined : v })
            }
          />
          <Input
            placeholder="Location"
            defaultValue={filters.location}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParams({ location: (e.target as HTMLInputElement).value || undefined });
              }
            }}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {records.length === 0 ? (
          <EmptyState
            title="No job openings"
            description="Create a job opening to start receiving candidates."
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-3">Job Title</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Positions</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Salary</th>
                  <th className="px-4 py-3">Candidates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.designationTitle ?? "—"} · {WORK_MODE_LABELS[row.workMode]}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.departmentName ?? "—"}</td>
                    <td className="px-4 py-3">{row.employmentTypeName ?? "—"}</td>
                    <td className="px-4 py-3">{row.openPositions}</td>
                    <td className="px-4 py-3">{row.location ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatCurrency(row.salaryMin)} – {formatCurrency(row.salaryMax)}
                    </td>
                    <td className="px-4 py-3">{row.candidateCount}</td>
                    <td className="px-4 py-3">
                      <RecruitmentStatusBadge
                        label={JOB_STATUS_LABELS[row.jobStatus]}
                        status={row.jobStatus}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {canCreate && row.jobStatus === "open" ? (
                          <Link
                            href={`${RECRUITMENT_ROUTES.candidates}?jobOpeningId=${row.id}&add=1`}
                            className={cn(
                              buttonVariants({ size: "sm", variant: "outline" }),
                              "inline-flex",
                            )}
                          >
                            <UserPlus className="mr-1 h-3.5 w-3.5" />
                            Add lead
                          </Link>
                        ) : null}
                        {canEdit ? (
                          <Button size="sm" variant="outline" onClick={() => setEditing(row)}>
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                        ) : null}
                        {canCreate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onDuplicate(row.id)}
                          >
                            <Copy className="mr-1 h-3.5 w-3.5" />
                            Duplicate
                          </Button>
                        ) : null}
                        {canEdit && row.jobStatus !== "closed" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => onClose(row.id)}
                          >
                            <XCircle className="mr-1 h-3.5 w-3.5" />
                            Close
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecruitmentPagination page={page} pageSize={pageSize} total={total} />

      {creating ? (
        <JobFormModal
          open={creating}
          onOpenChange={setCreating}
          lookups={lookups}
          mode="create"
        />
      ) : null}
      {editing ? (
        <JobFormModal
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          lookups={lookups}
          mode="edit"
          record={editing}
        />
      ) : null}
    </div>
  );
}

function JobFormModal({
  open,
  onOpenChange,
  lookups,
  mode,
  record,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: RecruitmentLookups;
  mode: "create" | "edit";
  record?: JobOpeningItem;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<JobFormInput>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: record
      ? {
          title: record.title,
          departmentId: record.departmentId ?? "",
          designationId: record.designationId ?? "",
          customDesignationTitle: "",
          employmentTypeId: record.employmentTypeId ?? "",
          experienceMin: record.experienceMin ?? undefined,
          experienceMax: record.experienceMax ?? undefined,
          salaryMin: record.salaryMin ?? undefined,
          salaryMax: record.salaryMax ?? undefined,
          openPositions: record.openPositions,
          location: record.location ?? "",
          workMode: record.workMode,
          hiringManagerId: record.hiringManagerId ?? "",
          requiredSkills: record.requiredSkills.join(", "),
          jobDescription: record.jobDescription ?? "",
          jobStatus: record.jobStatus,
        }
      : {
          title: "",
          designationId: "",
          customDesignationTitle: "",
          hiringManagerId: lookups.defaultHiringManagerId ?? "",
          openPositions: 1,
          workMode: "onsite",
          jobStatus: "draft",
        },
  });

  const designationValue = (form.watch("designationId") as string) ?? "";
  const isOtherDesignation = designationValue === DESIGNATION_OTHER_VALUE;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "create" ? "Create Job Opening" : "Edit Job Opening"}
      description="Define the role requirements and hiring details."
      contentClassName="sm:max-w-3xl"
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            startTransition(async () => {
              const result =
                mode === "create"
                  ? await createJobOpeningAction(values)
                  : await updateJobOpeningAction(record!.id, values);
              if (!result.success) toast.error(result.message);
              else {
                toast.success(mode === "create" ? "Job created" : "Job updated");
                onOpenChange(false);
                router.refresh();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {mode === "create" ? (
            <>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Job
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job Title" className="sm:col-span-2">
          <Input disabled={isPending} {...form.register("title")} />
        </Field>
        <Field label="Department">
          <LabeledSelect
            items={[
              { value: "", label: "Select department" },
              ...lookups.departments.map((d) => ({ value: d.id, label: d.label })),
            ]}
            value={(form.watch("departmentId") as string) ?? ""}
            onValueChange={(v) => form.setValue("departmentId", v)}
            disabled={isPending}
          />
        </Field>
        <Field label="Designation">
          <LabeledSelect
            items={[
              { value: "", label: "Select designation" },
              ...lookups.designations.map((d) => ({ value: d.id, label: d.label })),
              { value: DESIGNATION_OTHER_VALUE, label: "Others (type manually)" },
            ]}
            value={designationValue}
            onValueChange={(v) => {
              form.setValue("designationId", v, { shouldValidate: true });
              if (v !== DESIGNATION_OTHER_VALUE) {
                form.setValue("customDesignationTitle", "");
              }
            }}
            disabled={isPending}
          />
        </Field>
        {isOtherDesignation ? (
          <Field label="Enter Designation" className="sm:col-span-2">
            <Input
              disabled={isPending}
              placeholder="Type designation title"
              {...form.register("customDesignationTitle")}
            />
            {form.formState.errors.customDesignationTitle ? (
              <p className="text-xs text-destructive">
                {String(form.formState.errors.customDesignationTitle.message ?? "Required")}
              </p>
            ) : null}
          </Field>
        ) : null}
        <Field label="Employment Type">
          <LabeledSelect
            items={[
              { value: "", label: "Select type" },
              ...lookups.employmentTypes.map((d) => ({ value: d.id, label: d.label })),
            ]}
            value={(form.watch("employmentTypeId") as string) ?? ""}
            onValueChange={(v) => form.setValue("employmentTypeId", v)}
            disabled={isPending}
          />
        </Field>
        <Field label="Work Mode">
          <LabeledSelect
            items={toSelectItems(WORK_MODE_LABELS)}
            value={form.watch("workMode")}
            onValueChange={(v) => form.setValue("workMode", v as JobFormInput["workMode"])}
            disabled={isPending}
          />
        </Field>
        <Field label="Experience Min (years)">
          <Input type="number" min={0} step="0.5" disabled={isPending} {...form.register("experienceMin")} />
        </Field>
        <Field label="Experience Max (years)">
          <Input type="number" min={0} step="0.5" disabled={isPending} {...form.register("experienceMax")} />
        </Field>
        <Field label="Salary Min">
          <Input type="number" min={0} disabled={isPending} {...form.register("salaryMin")} />
        </Field>
        <Field label="Salary Max">
          <Input type="number" min={0} disabled={isPending} {...form.register("salaryMax")} />
        </Field>
        <Field label="Open Positions">
          <Input type="number" min={1} disabled={isPending} {...form.register("openPositions")} />
        </Field>
        <Field label="Location">
          <Input disabled={isPending} {...form.register("location")} />
        </Field>
        <Field label="Reporting Manager / Hiring Manager" className="sm:col-span-2">
          <EmployeeSelect
            employees={lookups.employees}
            value={(form.watch("hiringManagerId") as string) ?? ""}
            onValueChange={(v) => form.setValue("hiringManagerId", v)}
            disabled={isPending}
          />
        </Field>
        <Field label="Required Skills (comma separated)" className="sm:col-span-2">
          <Input disabled={isPending} placeholder="React, TypeScript, SQL" {...form.register("requiredSkills")} />
        </Field>
        <Field label="Job Description" className="sm:col-span-2">
          <Input disabled={isPending} {...form.register("jobDescription")} />
        </Field>
        <Field label="Status">
          <LabeledSelect
            items={toSelectItems(JOB_STATUS_LABELS)}
            value={form.watch("jobStatus")}
            onValueChange={(v) => form.setValue("jobStatus", v as JobFormInput["jobStatus"])}
            disabled={isPending}
          />
        </Field>
      </div>
    </Modal>
  );
}
