"use client";

import { format } from "date-fns";
import {
  CalendarPlus,
  FilePlus2,
  Loader2,
  UserPlus,
  XCircle,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { RecruitmentPagination } from "@/components/recruitment/recruitment-pagination";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import {
  createCandidateAction,
  createOfferAction,
  moveCandidateStageAction,
  scheduleInterviewAction,
} from "@/lib/recruitment/actions";
import {
  CANDIDATE_STAGE_LABELS,
  INTERVIEW_DURATION_OPTIONS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/recruitment/constants";
import { formatCurrency } from "@/lib/recruitment/services/recruitment-utils";
import {
  candidateFormSchema,
  interviewFormSchema,
  moveStageSchema,
  offerFormSchema,
} from "@/lib/validations/recruitment";
import type {
  CandidateDetail,
  CandidateListItem,
  RecruitmentLookups,
} from "@/types/recruitment";

type CandidateFormInput = z.input<typeof candidateFormSchema>;

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

export function CandidatesManagement({
  records,
  total,
  page,
  pageSize,
  lookups,
  selected,
  canCreate,
  canEdit,
  canInterview,
  canOffer,
  filters,
}: {
  records: CandidateListItem[];
  total: number;
  page: number;
  pageSize: number;
  lookups: RecruitmentLookups;
  selected: CandidateDetail | null;
  canCreate: boolean;
  canEdit: boolean;
  canInterview: boolean;
  canOffer: boolean;
  filters: {
    search?: string;
    departmentId?: string;
    jobOpeningId?: string;
    stage?: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("add") === "1" && filters.jobOpeningId && canCreate) {
      setCreating(true);
    }
  }, [searchParams, filters.jobOpeningId, canCreate]);

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.set("page", "1");
    startTransition(() => router.push(`?${params.toString()}`));
  }

  function selectCandidate(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("candidateId", id);
    startTransition(() => router.push(`?${params.toString()}`));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track applicants across screening, interviews, offer, and joining.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setCreating(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Candidate
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <Input
            placeholder="Search candidate..."
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
              { value: "all", label: "All positions" },
              ...lookups.jobs.map((j) => ({ value: j.id, label: j.label })),
            ]}
            value={filters.jobOpeningId ?? "all"}
            onValueChange={(v) => updateParams({ jobOpeningId: v === "all" ? undefined : v })}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All stages" },
              ...toSelectItems(CANDIDATE_STAGE_LABELS),
            ]}
            value={filters.stage ?? "all"}
            onValueChange={(v) => updateParams({ stage: v === "all" ? undefined : v })}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          {records.length === 0 ? (
            <EmptyState
              title="No candidates"
              description="Add a candidate against an open job to start the hiring pipeline."
              className="border-0"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                    <th className="px-4 py-3">Candidate</th>
                    <th className="px-4 py-3">Position</th>
                    <th className="px-4 py-3">Experience</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((row) => (
                    <tr
                      key={row.id}
                      className={`cursor-pointer border-b hover:bg-muted/40 ${
                        selected?.id === row.id ? "bg-muted/50" : ""
                      }`}
                      onClick={() => selectCandidate(row.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.fullName}</div>
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                      </td>
                      <td className="px-4 py-3">{row.jobTitle}</td>
                      <td className="px-4 py-3">
                        {row.experienceYears != null ? `${row.experienceYears} yrs` : "—"}
                      </td>
                      <td className="px-4 py-3">{row.source ?? "—"}</td>
                      <td className="px-4 py-3">
                        <RecruitmentStatusBadge
                          label={CANDIDATE_STAGE_LABELS[row.stage]}
                          status={row.stage}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm">
          {!selected ? (
            <EmptyState
              title="Select a candidate"
              description="Choose a candidate from the list to view profile, timeline, and actions."
              className="border-0"
            />
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">{selected.fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  {selected.email}
                  {selected.phone ? ` · ${selected.phone}` : ""}
                </p>
                <div className="mt-2">
                  <RecruitmentStatusBadge
                    label={CANDIDATE_STAGE_LABELS[selected.stage]}
                    status={selected.stage}
                  />
                </div>
              </div>

              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <Info label="Applied Position" value={selected.jobTitle} />
                <Info label="Department" value={selected.departmentName ?? "—"} />
                <Info
                  label="Experience"
                  value={
                    selected.experienceYears != null ? `${selected.experienceYears} years` : "—"
                  }
                />
                <Info label="Current Company" value={selected.currentCompany ?? "—"} />
                <Info label="Current CTC" value={formatCurrency(selected.currentCtc)} />
                <Info label="Expected CTC" value={formatCurrency(selected.expectedCtc)} />
                <Info
                  label="Notice Period"
                  value={
                    selected.noticePeriodDays != null
                      ? `${selected.noticePeriodDays} days`
                      : "—"
                  }
                />
                <Info label="Source" value={selected.source ?? "—"} />
                <Info
                  label="Skills"
                  value={selected.skills.length ? selected.skills.join(", ") : "—"}
                  className="sm:col-span-2"
                />
                <Info label="Notes" value={selected.notes ?? "—"} className="sm:col-span-2" />
              </dl>

              <div className="flex flex-wrap gap-2">
                {canEdit && !["joined", "rejected"].includes(selected.stage) ? (
                  <Button size="sm" variant="outline" onClick={() => setMoveOpen(true)}>
                    Move Stage
                  </Button>
                ) : null}
                {canInterview && !["joined", "rejected"].includes(selected.stage) ? (
                  <Button size="sm" variant="outline" onClick={() => setInterviewOpen(true)}>
                    <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                    Schedule Interview
                  </Button>
                ) : null}
                {canOffer && !["joined", "rejected"].includes(selected.stage) ? (
                  <Button size="sm" onClick={() => setOfferOpen(true)}>
                    <FilePlus2 className="mr-1 h-3.5 w-3.5" />
                    Send Offer
                  </Button>
                ) : null}
                {canEdit && selected.stage !== "rejected" && selected.stage !== "joined" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      startTransition(async () => {
                        const result = await moveCandidateStageAction({
                          candidateId: selected.id,
                          stage: "rejected",
                          reason: "Rejected by HR",
                        });
                        if (!result.success) toast.error(result.message);
                        else {
                          toast.success("Candidate rejected");
                          router.refresh();
                        }
                      });
                    }}
                  >
                    <XCircle className="mr-1 h-3.5 w-3.5" />
                    Reject
                  </Button>
                ) : null}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Timeline</h3>
                <div className="space-y-3">
                  {selected.timeline.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No events yet.</p>
                  ) : (
                    selected.timeline.map((item) => (
                      <div key={item.id} className="border-l-2 border-primary/30 pl-3">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "MMM d, yyyy · h:mm a")}
                        </p>
                        {item.description ? (
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <RecruitmentPagination page={page} pageSize={pageSize} total={total} />

      {creating ? (
        <CandidateFormModal
          open={creating}
          onOpenChange={setCreating}
          lookups={lookups}
          defaultJobOpeningId={filters.jobOpeningId}
        />
      ) : null}
      {selected && moveOpen ? (
        <MoveStageModal
          open={moveOpen}
          onOpenChange={setMoveOpen}
          candidateId={selected.id}
          currentStage={selected.stage}
        />
      ) : null}
      {selected && interviewOpen ? (
        <ScheduleInterviewModal
          open={interviewOpen}
          onOpenChange={setInterviewOpen}
          candidateId={selected.id}
          lookups={lookups}
        />
      ) : null}
      {selected && offerOpen ? (
        <CreateOfferModal
          open={offerOpen}
          onOpenChange={setOfferOpen}
          candidate={selected}
          lookups={lookups}
        />
      ) : null}
    </div>
  );
}

function Info({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function CandidateFormModal({
  open,
  onOpenChange,
  lookups,
  defaultJobOpeningId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: RecruitmentLookups;
  defaultJobOpeningId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const openJobs = useMemo(
    () => lookups.jobs.filter((j) => !j.status || j.status === "open" || j.status === "paused"),
    [lookups.jobs],
  );
  const form = useForm<CandidateFormInput>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: {
      jobOpeningId: defaultJobOpeningId ?? "",
      firstName: "",
      lastName: "",
      email: "",
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Candidate"
      description="Register a candidate against a job opening."
      contentClassName="sm:max-w-3xl"
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await createCandidateAction(values);
              if (!result.success) toast.error(result.message);
              else {
                toast.success("Candidate added");
                onOpenChange(false);
                router.refresh();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          <UserPlus className="mr-1.5 h-4 w-4" />
          Save Candidate
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Job Position" className="sm:col-span-2">
          <LabeledSelect
            items={openJobs.map((j) => ({ value: j.id, label: j.label }))}
            value={form.watch("jobOpeningId")}
            onValueChange={(v) => form.setValue("jobOpeningId", v, { shouldValidate: true })}
            placeholder="Select job"
            disabled={isPending}
          />
        </Field>
        <Field label="First Name">
          <Input disabled={isPending} {...form.register("firstName")} />
        </Field>
        <Field label="Last Name">
          <Input disabled={isPending} {...form.register("lastName")} />
        </Field>
        <Field label="Email">
          <Input type="email" disabled={isPending} {...form.register("email")} />
        </Field>
        <Field label="Phone">
          <Input disabled={isPending} {...form.register("phone")} />
        </Field>
        <Field label="Experience (years)">
          <Input type="number" min={0} step="0.5" disabled={isPending} {...form.register("experienceYears")} />
        </Field>
        <Field label="Source">
          <LabeledSelect
            items={lookups.sources.map((s) => ({ value: s, label: s }))}
            value={(form.watch("source") as string) ?? ""}
            onValueChange={(v) => form.setValue("source", v)}
            placeholder="Select source"
            disabled={isPending}
          />
        </Field>
        <Field label="Current Company" className="sm:col-span-2">
          <Input disabled={isPending} {...form.register("currentCompany")} />
        </Field>
        <Field label="Skills (comma separated)" className="sm:col-span-2">
          <Input disabled={isPending} {...form.register("skills")} />
        </Field>
        <Field label="Current CTC">
          <Input type="number" min={0} disabled={isPending} {...form.register("currentCtc")} />
        </Field>
        <Field label="Expected CTC">
          <Input type="number" min={0} disabled={isPending} {...form.register("expectedCtc")} />
        </Field>
        <Field label="Notice Period">
          <LabeledSelect
            items={(lookups.noticePeriodOptions ?? []).map((s) => ({ value: s, label: s }))}
            value={(form.watch("noticePeriod") as string) ?? ""}
            onValueChange={(v) => form.setValue("noticePeriod", v)}
            placeholder="Select notice period"
            disabled={isPending}
          />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Input disabled={isPending} {...form.register("notes")} />
        </Field>
      </div>
    </Modal>
  );
}

function MoveStageModal({
  open,
  onOpenChange,
  candidateId,
  currentStage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  currentStage: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof moveStageSchema>>({
    resolver: zodResolver(moveStageSchema),
    defaultValues: { candidateId, stage: currentStage as z.infer<typeof moveStageSchema>["stage"] },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Move Candidate Stage"
      contentClassName="sm:max-w-md"
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await moveCandidateStageAction(values);
              if (!result.success) toast.error(result.message);
              else {
                toast.success("Stage updated");
                onOpenChange(false);
                router.refresh();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Update Stage
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Stage">
          <LabeledSelect
            items={toSelectItems(CANDIDATE_STAGE_LABELS)}
            value={form.watch("stage")}
            onValueChange={(v) =>
              form.setValue("stage", v as z.infer<typeof moveStageSchema>["stage"])
            }
            disabled={isPending}
          />
        </Field>
        <Field label="Reason / Notes">
          <Input disabled={isPending} {...form.register("reason")} />
        </Field>
      </div>
    </Modal>
  );
}

function ScheduleInterviewModal({
  open,
  onOpenChange,
  candidateId,
  lookups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  lookups: RecruitmentLookups;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof interviewFormSchema>>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: {
      candidateId,
      interviewerEmployeeId: "",
      roundName: "Technical Round",
      interviewDate: "",
      interviewTime: "10:00",
      interviewType: "offline",
      durationMinutes: lookups.defaultInterviewDurationMinutes ?? 60,
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule Interview"
      contentClassName="sm:max-w-xl"
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await scheduleInterviewAction(values);
              if (!result.success) toast.error(result.message);
              else {
                toast.success("Interview scheduled");
                onOpenChange(false);
                router.refresh();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          Schedule
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Interviewer" className="sm:col-span-2">
          <EmployeeSelect
            employees={lookups.employees}
            value={form.watch("interviewerEmployeeId")}
            onValueChange={(v) => form.setValue("interviewerEmployeeId", v, { shouldValidate: true })}
            disabled={isPending}
          />
        </Field>
        <Field label="Round">
          <Input disabled={isPending} {...form.register("roundName")} />
        </Field>
        <Field label="Interview Type">
          <LabeledSelect
            items={toSelectItems(INTERVIEW_TYPE_LABELS)}
            value={form.watch("interviewType")}
            onValueChange={(v) =>
              form.setValue(
                "interviewType",
                v as z.input<typeof interviewFormSchema>["interviewType"],
              )
            }
            disabled={isPending}
          />
        </Field>
        <Field label="Date">
          <Input type="date" disabled={isPending} {...form.register("interviewDate")} />
        </Field>
        <Field label="Time">
          <Input type="time" disabled={isPending} {...form.register("interviewTime")} />
        </Field>
        <Field label="Duration">
          <LabeledSelect
            items={INTERVIEW_DURATION_OPTIONS.map((o) => ({
              value: String(o.value),
              label: o.label,
            }))}
            value={String(form.watch("durationMinutes") ?? lookups.defaultInterviewDurationMinutes)}
            onValueChange={(v) => form.setValue("durationMinutes", Number(v))}
            disabled={isPending}
          />
        </Field>
        <Field label="Meeting Link">
          <Input disabled={isPending} placeholder="Optional" {...form.register("meetingLink")} />
        </Field>
      </div>
    </Modal>
  );
}

function CreateOfferModal({
  open,
  onOpenChange,
  candidate,
  lookups,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateDetail;
  lookups: RecruitmentLookups;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof offerFormSchema>>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      candidateId: candidate.id,
      salary: candidate.expectedCtc ?? undefined,
      joiningDate: "",
      branchId: lookups.branches[0]?.id ?? "",
      notes: "",
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Generate Offer"
      description={`${candidate.fullName} · ${candidate.jobTitle}`}
      contentClassName="sm:max-w-2xl"
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await createOfferAction(values);
              if (!result.success) toast.error(result.message);
              else {
                toast.success("Offer created");
                onOpenChange(false);
                router.refresh();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          <FilePlus2 className="mr-1.5 h-4 w-4" />
          Create Offer
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Salary">
          <Input type="number" min={1} disabled={isPending} {...form.register("salary")} />
        </Field>
        <Field label="Joining Date">
          <Input type="date" disabled={isPending} {...form.register("joiningDate")} />
        </Field>
        <Field label="Branch">
          <LabeledSelect
            items={lookups.branches.map((b) => ({ value: b.id, label: b.label }))}
            value={form.watch("branchId")}
            onValueChange={(v) => form.setValue("branchId", v, { shouldValidate: true })}
            disabled={isPending}
          />
        </Field>
        <Field label="Department">
          <LabeledSelect
            items={[
              { value: "", label: "From job" },
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
              { value: "", label: "From job" },
              ...lookups.designations.map((d) => ({ value: d.id, label: d.label })),
            ]}
            value={(form.watch("designationId") as string) ?? ""}
            onValueChange={(v) => form.setValue("designationId", v)}
            disabled={isPending}
          />
        </Field>
        <Field label="Employment Type">
          <LabeledSelect
            items={[
              { value: "", label: "From job" },
              ...lookups.employmentTypes.map((d) => ({ value: d.id, label: d.label })),
            ]}
            value={(form.watch("employmentTypeId") as string) ?? ""}
            onValueChange={(v) => form.setValue("employmentTypeId", v)}
            disabled={isPending}
          />
        </Field>
        <Field label="Reporting Manager" className="sm:col-span-2">
          <EmployeeSelect
            employees={lookups.employees}
            value={(form.watch("reportingManagerId") as string) ?? ""}
            onValueChange={(v) => form.setValue("reportingManagerId", v)}
            disabled={isPending}
          />
        </Field>
        <Field label="Offer Expiry">
          <Input type="date" disabled={isPending} {...form.register("expiresAt")} />
        </Field>
        <Field label="Notes">
          <Input disabled={isPending} {...form.register("notes")} />
        </Field>
      </div>
    </Modal>
  );
}
