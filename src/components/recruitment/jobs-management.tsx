"use client";

import { Briefcase, Loader2, MapPin, Pencil, Plus, Trash2, Users, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Modal } from "@/components/common/modal";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { RecruitmentPagination } from "@/components/recruitment/recruitment-pagination";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import {
  closeJobOpeningAction,
  createJobOpeningAction,
  deleteJobOpeningAction,
  updateJobOpeningAction,
} from "@/lib/recruitment/actions";
import {
  JOB_STATUS_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/recruitment/constants";
import { HIRING_SECTION_HELP } from "@/lib/recruitment/section-help";
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
  canDelete,
  filters,
}: {
  records: JobOpeningItem[];
  total: number;
  page: number;
  pageSize: number;
  lookups: RecruitmentLookups;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
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
  const [deleting, setDeleting] = useState<JobOpeningItem | null>(null);
  const [visibleJobs, setVisibleJobs] = useState(records);
  const [listTotal, setListTotal] = useState(total);

  useEffect(() => {
    setVisibleJobs(records);
    setListTotal(total);
  }, [records, total]);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.set("page", "1");
    startTransition(() => router.push(`?${params.toString()}`));
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

  function onDelete() {
    if (!deleting) return;

    const job = deleting;
    const snapshot = visibleJobs;
    const snapshotTotal = listTotal;

    setDeleting(null);
    setVisibleJobs((prev) => prev.filter((row) => row.id !== job.id));
    setListTotal((prev) => Math.max(0, prev - 1));

    void deleteJobOpeningAction(job.id).then((result) => {
      if (!result.success) {
        setVisibleJobs(snapshot);
        setListTotal(snapshotTotal);
        toast.error(result.message);
        return;
      }
      startTransition(() => router.refresh());
    });
  }

  const openCount = visibleJobs.filter((r) => r.jobStatus === "open").length;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <SectionHelpButton
            title={HIRING_SECTION_HELP.jobs.title}
            points={[...HIRING_SECTION_HELP.jobs.points]}
          >
            <h1 className="text-2xl font-semibold tracking-tight">Job Openings</h1>
          </SectionHelpButton>
          <p className="mt-1 text-sm text-muted-foreground">
            {listTotal} role{listTotal === 1 ? "" : "s"} · {openCount} currently open
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Job
          </Button>
        ) : null}
      </div>

      <div className="shrink-0 rounded-xl border bg-card p-3 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
        {visibleJobs.length === 0 ? (
          <EmptyState
            title="No job openings"
            description="Create a job opening to start receiving candidates."
            className="rounded-xl border bg-card shadow-sm"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleJobs.map((row) => (
              <article
                key={row.id}
                className="flex h-full flex-col rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/25 hover:shadow-md animate-in fade-in duration-200"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      row.jobStatus === "open"
                        ? "bg-emerald-100 text-emerald-600"
                        : row.jobStatus === "draft"
                          ? "bg-slate-100 text-slate-600"
                          : row.jobStatus === "paused"
                            ? "bg-amber-100 text-amber-600"
                            : "bg-muted text-muted-foreground",
                    )}
                  >
                    <Briefcase className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold tracking-tight">
                        {row.title}
                      </h2>
                      <RecruitmentStatusBadge
                        label={JOB_STATUS_LABELS[row.jobStatus]}
                        status={row.jobStatus}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      {row.designationTitle ?? "No designation"} ·{" "}
                      {WORK_MODE_LABELS[row.workMode]}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {row.departmentName ? (
                    <span className="rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                      {row.departmentName}
                    </span>
                  ) : null}
                  {row.employmentTypeName ? (
                    <span className="rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                      {row.employmentTypeName}
                    </span>
                  ) : null}
                  <span className="rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] font-medium tabular-nums">
                    {row.openPositions} position{row.openPositions === 1 ? "" : "s"}
                  </span>
                  {row.location ? (
                    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] font-medium">
                      <MapPin className="h-3 w-3" />
                      {row.location}
                    </span>
                  ) : null}
                  <span className="rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] font-medium tabular-nums">
                    {formatCurrency(row.salaryMin)} – {formatCurrency(row.salaryMax)}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                    <Users className="h-3 w-3" />
                    {row.candidateCount} candidate{row.candidateCount === 1 ? "" : "s"}
                  </span>
                </div>

                {canEdit || canDelete ? (
                  <div className="mt-auto flex shrink-0 flex-wrap items-center gap-1 pt-3">
                    {canEdit ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setEditing(row)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-muted-foreground hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                        onClick={() => setDeleting(row)}
                        aria-label={`Delete ${row.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    {canEdit && row.jobStatus !== "closed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => onClose(row.id)}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                        Close
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="shrink-0">
        <RecruitmentPagination page={page} pageSize={pageSize} total={listTotal} />
      </div>

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

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete job opening?</DialogTitle>
            <DialogDescription>
              {deleting
                ? `"${deleting.title}" will be permanently removed. This cannot be undone. Jobs with linked candidates must be cleared first.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onDelete}
            >
              Delete job
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          {mode === "create" ? "Create" : "Save Changes"}
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
