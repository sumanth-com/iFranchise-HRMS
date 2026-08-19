"use client";

import {
  CalendarPlus,
  Loader2,
  UserPlus,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { PhoneInput } from "@/components/common/phone-input";
import { SectionHelpButton } from "@/components/common/section-help-button";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { CandidateDetailPanel } from "@/components/recruitment/candidate-detail-panel";
import { getUndoRejectStage } from "@/components/recruitment/candidate-pipeline-track";
import { RecruitmentPagination } from "@/components/recruitment/recruitment-pagination";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import {
  createCandidateAction,
  getCandidateDetailAction,
  moveCandidateStageAction,
  scheduleInterviewAction,
} from "@/lib/recruitment/actions";
import {
  CANDIDATE_STAGE_LABELS,
  getCandidateStageBadge,
  INTERVIEW_DURATION_OPTIONS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/recruitment/constants";
import { HIRING_SECTION_HELP } from "@/lib/recruitment/section-help";
import {
  applyInterviewEmailTemplate,
  formatInterviewDateLabel,
  formatInterviewTimeLabel,
} from "@/lib/recruitment/interview-email-content";
import { cn } from "@/lib/utils";
import {
  candidateFormSchema,
  interviewFormSchema,
} from "@/lib/validations/recruitment";
import type {
  CandidateDetail,
  CandidateListItem,
  RecruitmentEmailTemplate,
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
  initialSelected,
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
  initialSelected: CandidateDetail | null;
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
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(Boolean(initialSelected));
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected?.id ?? null);
  const [selectedDetail, setSelectedDetail] = useState<CandidateDetail | null>(initialSelected);
  const [detailLoading, setDetailLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [visibleCandidates, setVisibleCandidates] = useState(records);
  const [listTotal, setListTotal] = useState(total);
  const [localFilters, setLocalFilters] = useState(filters);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    if (searchParams.get("add") === "1" && filters.jobOpeningId && canCreate) {
      setCreating(true);
    }
  }, [searchParams, filters.jobOpeningId, canCreate]);

  useEffect(() => {
    if (!initialSelected || !selectedId || initialSelected.id !== selectedId) return;
    setSelectedDetail((prev) => {
      if (!prev || prev.id !== initialSelected.id) return initialSelected;
      const richness =
        (d: CandidateDetail) => d.interviews.length + d.offers.length + d.timeline.length;
      return richness(initialSelected) >= richness(prev) ? initialSelected : prev;
    });
  }, [initialSelected, selectedId]);

  useEffect(() => {
    setVisibleCandidates(records);
    setListTotal(total);
    setLocalFilters(filters);
  }, [records, total, filters]);

  useEffect(() => {
    let filtered = records;

    if (localFilters.search?.trim()) {
      const q = localFilters.search.trim().toLowerCase();
      filtered = filtered.filter((row) =>
        [
          row.fullName,
          row.email,
          row.jobTitle,
          row.departmentName,
          row.source,
          row.phone,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q)),
      );
    }

    if (localFilters.departmentId) {
      const departmentLabel = lookups.departments.find(
        (department) => department.id === localFilters.departmentId,
      )?.label;
      filtered = filtered.filter((row) => row.departmentName === departmentLabel);
    }

    if (localFilters.jobOpeningId) {
      filtered = filtered.filter((row) => row.jobOpeningId === localFilters.jobOpeningId);
    }

    if (localFilters.stage) {
      filtered = filtered.filter((row) => row.stage === localFilters.stage);
    }

    setVisibleCandidates(filtered);
    setListTotal(filtered.length);
  }, [localFilters, lookups.departments, records]);

  const syncCandidateUrl = useCallback(
    (candidateId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (candidateId) params.set("candidateId", candidateId);
      else params.delete("candidateId");
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `?${query}` : "?", { scroll: false });
      });
    },
    [router, searchParams, startTransition],
  );

  const refreshDetail = useCallback(async (candidateId: string) => {
    const result = await getCandidateDetailAction(candidateId);
    if (result.success) {
      setSelectedDetail(result.data);
    } else {
      toast.error(result.message);
    }
    startTransition(() => {
      router.refresh();
    });
  }, [router, startTransition]);

  const loadCandidate = useCallback(
    async (id: string) => {
      setSelectedId(id);
      setPanelOpen(true);
      setDetailLoading(true);
      syncCandidateUrl(id);

      const result = await getCandidateDetailAction(id);
      setDetailLoading(false);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setSelectedDetail(result.data);
    },
    [syncCandidateUrl],
  );

  function closePanel() {
    setPanelOpen(false);
    setSelectedId(null);
    setSelectedDetail(null);
    syncCandidateUrl(null);
  }

  function updateParams(updates: Record<string, string | undefined>) {
    setLocalFilters((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(updates)) {
        if (!value || value === "all") {
          delete (next as Record<string, string | undefined>)[key];
        } else {
          (next as Record<string, string | undefined>)[key] = value;
        }
      }
      return next;
    });

    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.set("page", "1");
    window.history.replaceState(null, "", `?${params.toString()}`);
  }

  const activeDetail = selectedDetail;
  const searchSuggestions = useMemo(() => {
    const values = new Set<string>();
    for (const row of records) {
      if (row.fullName) values.add(row.fullName);
      if (row.email) values.add(row.email);
      if (row.jobTitle) values.add(row.jobTitle);
      if (row.source) values.add(row.source);
    }
    return [...values].sort((a, b) => a.localeCompare(b));
  }, [records]);
  const visibleSearchSuggestions = useMemo(() => {
    const query = localFilters.search?.trim().toLowerCase() ?? "";
    if (query.length < 2) return [];
    return searchSuggestions
      .filter((value) => value.toLowerCase().includes(query))
      .slice(0, 5);
  }, [localFilters.search, searchSuggestions]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div>
          <SectionHelpButton
            title={HIRING_SECTION_HELP.candidates.title}
            points={[...HIRING_SECTION_HELP.candidates.points]}
          >
            <h1 className="text-2xl font-semibold tracking-tight">Candidates</h1>
          </SectionHelpButton>
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

      <div className="shrink-0 rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-4">
          <div className="relative">
            <Input
              placeholder="Search candidate..."
              value={localFilters.search ?? ""}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchFocused(false), 120);
              }}
              onChange={(e) => updateParams({ search: e.target.value || undefined })}
            />
            {searchFocused && visibleSearchSuggestions.length > 0 ? (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-1 shadow-lg">
                {visibleSearchSuggestions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      updateParams({ search: value });
                      setSearchFocused(false);
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <LabeledSelect
            items={[
              { value: "all", label: "All positions" },
              ...lookups.jobs.map((j) => ({ value: j.id, label: j.label })),
            ]}
            value={localFilters.jobOpeningId ?? "all"}
            onValueChange={(v) => updateParams({ jobOpeningId: v === "all" ? undefined : v })}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All stages" },
              ...toSelectItems(CANDIDATE_STAGE_LABELS),
            ]}
            value={localFilters.stage ?? "all"}
            onValueChange={(v) => updateParams({ stage: v === "all" ? undefined : v })}
          />
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-4",
          panelOpen ? "xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]" : "grid-cols-1",
        )}
      >
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="shrink-0 border-b px-4 py-2.5 text-xs text-muted-foreground">
            {listTotal} candidate{listTotal === 1 ? "" : "s"}
          </div>
          {visibleCandidates.length === 0 ? (
            <EmptyState
              title="No candidates"
              description="Add a candidate against an open job to start the hiring pipeline."
              className="border-0"
            />
          ) : (
            <ul className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain">
              {visibleCandidates.map((row) => {
                const isActive = panelOpen && selectedId === row.id;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => loadCandidate(row.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left transition-colors hover:bg-muted/40",
                        isActive && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{row.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                        </div>
                        <RecruitmentStatusBadge
                          {...getCandidateStageBadge(row.stage, row.latestOfferStatus)}
                        />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{row.jobTitle}</span>
                        {row.experienceYears != null ? (
                          <span>{row.experienceYears} yrs</span>
                        ) : null}
                        {row.source ? <span>{row.source}</span> : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="shrink-0 border-t px-2 py-2">
            <RecruitmentPagination page={page} pageSize={pageSize} total={listTotal} />
          </div>
        </div>

        {panelOpen ? (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <CandidateDetailPanel
            detail={activeDetail}
            loading={detailLoading}
            onClose={closePanel}
            canEdit={canEdit}
            canInterview={canInterview}
            canOffer={canOffer}
            onScheduleInterview={() => setInterviewOpen(true)}
            onReject={() => {
              if (!activeDetail) return;
              setRejecting(true);
              startTransition(async () => {
                const result = await moveCandidateStageAction({
                  candidateId: activeDetail.id,
                  stage: "rejected",
                  reason: "Rejected by HR",
                });
                setRejecting(false);
                if (!result.success) toast.error(result.message);
                else {
                  toast.success("Candidate rejected");
                  await refreshDetail(activeDetail.id);
                }
              });
            }}
            onUndoReject={() => {
              if (!activeDetail) return;
              const restoreStage = getUndoRejectStage(activeDetail);
              setRejecting(true);
              startTransition(async () => {
                const result = await moveCandidateStageAction({
                  candidateId: activeDetail.id,
                  stage: restoreStage,
                  reason: "Rejection undone by HR",
                });
                setRejecting(false);
                if (!result.success) toast.error(result.message);
                else {
                  toast.success(
                    `Rejection undone — restored to ${CANDIDATE_STAGE_LABELS[restoreStage]}`,
                  );
                  await refreshDetail(activeDetail.id);
                }
              });
            }}
            rejecting={rejecting}
            onRefresh={() => {
              if (activeDetail) void refreshDetail(activeDetail.id);
            }}
            />
          </div>
        ) : null}
      </div>

      {creating ? (
        <CandidateFormModal
          open={creating}
          onOpenChange={setCreating}
          lookups={lookups}
          defaultJobOpeningId={filters.jobOpeningId}
        />
      ) : null}
      {activeDetail && interviewOpen ? (
        <ScheduleInterviewModal
          open={interviewOpen}
          onOpenChange={setInterviewOpen}
          candidate={activeDetail}
          lookups={lookups}
          onSuccess={() => {
            void refreshDetail(activeDetail.id);
          }}
        />
      ) : null}
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
          <PhoneInput
            value={form.watch("phone") ?? ""}
            onChange={(value) => form.setValue("phone", value, { shouldValidate: true })}
            disabled={isPending}
            error={form.formState.errors.phone?.message}
          />
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

function defaultInterviewTemplate(
  templates: RecruitmentEmailTemplate[],
): RecruitmentEmailTemplate | null {
  return (
    templates.find((item) => item.id === "interview_scheduled") ??
    templates.find((item) => item.name.toLowerCase().includes("interview")) ??
    null
  );
}

function ScheduleInterviewModal({
  open,
  onOpenChange,
  candidate,
  lookups,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: CandidateDetail;
  lookups: RecruitmentLookups;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const emailTouchedRef = useRef(false);
  const interviewTemplates = useMemo(
    () =>
      lookups.emailTemplates.filter(
        (item) =>
          item.id === "interview_scheduled" ||
          item.name.toLowerCase().includes("interview"),
      ),
    [lookups.emailTemplates],
  );
  const form = useForm<z.input<typeof interviewFormSchema>>({
    resolver: zodResolver(interviewFormSchema),
    defaultValues: {
      candidateId: candidate.id,
      interviewerEmployeeId: "",
      roundName: "Technical Round",
      interviewDate: "",
      interviewTime: "10:00",
      interviewType: "offline",
      durationMinutes: lookups.defaultInterviewDurationMinutes ?? 60,
      emailTemplateId: defaultInterviewTemplate(interviewTemplates)?.id ?? "",
      emailSubject: "",
      emailMessage: "",
    },
  });

  const interviewerEmployeeId = form.watch("interviewerEmployeeId");
  const roundName = form.watch("roundName");
  const interviewDate = form.watch("interviewDate");
  const interviewTime = form.watch("interviewTime");
  const interviewType = form.watch("interviewType");
  const durationMinutes = form.watch("durationMinutes");
  const meetingLink = form.watch("meetingLink");
  const emailTemplateId = form.watch("emailTemplateId");

  const applySelectedTemplate = useCallback(
    (templateId: string) => {
      const template =
        interviewTemplates.find((item) => item.id === templateId) ??
        defaultInterviewTemplate(interviewTemplates);
      if (!template) return;

      const interviewer =
        lookups.employees.find((item) => item.id === interviewerEmployeeId)?.label ?? "";
      const variables = {
        candidateName: candidate.fullName,
        position: candidate.jobTitle,
        roundName: roundName || "Interview",
        interviewDate: formatInterviewDateLabel(interviewDate),
        interviewTime: formatInterviewTimeLabel(interviewTime),
        duration: String(durationMinutes ?? lookups.defaultInterviewDurationMinutes ?? 60),
        interviewType:
          INTERVIEW_TYPE_LABELS[interviewType ?? "offline"] ?? interviewType ?? "Offline",
        meetingLink: meetingLink?.trim() ?? "",
        interviewer,
        hrEmail: lookups.offerEmailDefaults.hrEmail,
        hrPhone: lookups.offerEmailDefaults.hrPhone,
      };

      form.setValue("emailTemplateId", template.id);
      form.setValue("emailSubject", applyInterviewEmailTemplate(template.subject, variables));
      form.setValue("emailMessage", applyInterviewEmailTemplate(template.body, variables));
    },
    [
      candidate.fullName,
      candidate.jobTitle,
      durationMinutes,
      form,
      interviewDate,
      interviewTime,
      interviewType,
      interviewTemplates,
      interviewerEmployeeId,
      lookups.defaultInterviewDurationMinutes,
      lookups.employees,
      lookups.offerEmailDefaults.hrEmail,
      lookups.offerEmailDefaults.hrPhone,
      meetingLink,
      roundName,
    ],
  );

  useEffect(() => {
    if (!open) return;
    emailTouchedRef.current = false;
    form.setValue("candidateId", candidate.id);
    const initial = defaultInterviewTemplate(interviewTemplates);
    if (initial) {
      applySelectedTemplate(initial.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, candidate.id]);

  useEffect(() => {
    if (!open || emailTouchedRef.current || !emailTemplateId) return;
    applySelectedTemplate(emailTemplateId);
  }, [
    open,
    emailTemplateId,
    interviewerEmployeeId,
    roundName,
    interviewDate,
    interviewTime,
    interviewType,
    durationMinutes,
    meetingLink,
    applySelectedTemplate,
  ]);

  const templateItems = interviewTemplates.map((item) => ({
    value: item.id,
    label: item.name,
  }));

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule Interview"
      contentClassName="sm:max-w-2xl"
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            if (templateItems.length > 0) {
              if (!emailTouchedRef.current && values.emailTemplateId) {
                applySelectedTemplate(values.emailTemplateId);
              }
              const emailSubject = form.getValues("emailSubject")?.trim() ?? "";
              const emailMessage = form.getValues("emailMessage")?.trim() ?? "";
              if (!emailSubject || !emailMessage) {
                toast.error("Email subject and message are required");
                return;
              }
            }

            startTransition(async () => {
              const result = await scheduleInterviewAction(form.getValues());
              if (!result.success) toast.error(result.message);
              else {
                toast.success("Interview scheduled and invite sent");
                onOpenChange(false);
                onSuccess();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          <CalendarPlus className="mr-1.5 h-4 w-4" />
          Schedule & send
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
        {templateItems.length > 0 ? (
          <div className="space-y-4 sm:col-span-2">
            <Field label="Mail template">
              <LabeledSelect
                items={templateItems}
                value={emailTemplateId || templateItems[0]?.value || ""}
                onValueChange={(value) => {
                  if (!value) return;
                  emailTouchedRef.current = false;
                  applySelectedTemplate(value);
                }}
                disabled={isPending}
              />
            </Field>
            <Field label="Email subject">
              <Input
                disabled={isPending}
                {...form.register("emailSubject", {
                  onChange: () => {
                    emailTouchedRef.current = true;
                  },
                })}
              />
            </Field>
            <Field label="Email message">
              <textarea
                className="min-h-[180px] w-full rounded-md border bg-background px-3 py-2 text-sm leading-relaxed"
                disabled={isPending}
                {...form.register("emailMessage", {
                  onChange: () => {
                    emailTouchedRef.current = true;
                  },
                })}
              />
              <p className="text-xs text-muted-foreground">
                Edit the invite above, then send to {candidate.email}.
              </p>
            </Field>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
