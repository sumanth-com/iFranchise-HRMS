"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Users } from "lucide-react";
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
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { RecruitmentPagination } from "@/components/recruitment/recruitment-pagination";
import { RecruitmentStatusBadge } from "@/components/recruitment/recruitment-status-badge";
import {
  cancelInterviewAction,
  completeInterviewAction,
} from "@/lib/recruitment/actions";
import {
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_LABELS,
  RECOMMENDATION_LABELS,
  RECRUITMENT_ROUTES,
} from "@/lib/recruitment/constants";
import { interviewCompleteSchema } from "@/lib/validations/recruitment";
import type { InterviewListItem, RecruitmentLookups } from "@/types/recruitment";
import { cn } from "@/lib/utils";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function InterviewsManagement({
  records,
  total,
  page,
  pageSize,
  lookups,
  canInterview,
  filters,
}: {
  records: InterviewListItem[];
  total: number;
  page: number;
  pageSize: number;
  lookups: RecruitmentLookups;
  canInterview: boolean;
  filters: {
    search?: string;
    jobOpeningId?: string;
    interviewStatus?: string;
    interviewerId?: string;
    dateFrom?: string;
    dateTo?: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [completing, setCompleting] = useState<InterviewListItem | null>(null);

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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Interviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Schedule rounds and capture interviewer feedback.
          </p>
        </div>
        {canInterview ? (
          <Link
            href={RECRUITMENT_ROUTES.candidates}
            className={cn(buttonVariants(), "inline-flex items-center")}
          >
            <Users className="mr-1.5 h-4 w-4" />
            Schedule from Candidates
          </Link>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-5">
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
              { value: "all", label: "All positions" },
              ...lookups.jobs.map((j) => ({ value: j.id, label: j.label })),
            ]}
            value={filters.jobOpeningId ?? "all"}
            onValueChange={(v) => updateParams({ jobOpeningId: v === "all" ? undefined : v })}
          />
          <LabeledSelect
            items={[
              { value: "all", label: "All statuses" },
              ...toSelectItems(INTERVIEW_STATUS_LABELS),
            ]}
            value={filters.interviewStatus ?? "all"}
            onValueChange={(v) =>
              updateParams({ interviewStatus: v === "all" ? undefined : v })
            }
          />
          <Input
            type="date"
            defaultValue={filters.dateFrom}
            onChange={(e) => updateParams({ dateFrom: e.target.value || undefined })}
          />
          <Input
            type="date"
            defaultValue={filters.dateTo}
            onChange={(e) => updateParams({ dateTo: e.target.value || undefined })}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {records.length === 0 ? (
          <EmptyState
            title="No interviews"
            description="Schedule interviews from the Candidates page or using the button above."
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Interviewer</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{row.candidateName}</td>
                    <td className="px-4 py-3">{row.jobTitle}</td>
                    <td className="px-4 py-3">{row.roundName}</td>
                    <td className="px-4 py-3">{row.interviewerName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.interviewDate} · {row.interviewTime}
                    </td>
                    <td className="px-4 py-3">{INTERVIEW_TYPE_LABELS[row.interviewType]}</td>
                    <td className="px-4 py-3">
                      <RecruitmentStatusBadge
                        label={INTERVIEW_STATUS_LABELS[row.interviewStatus]}
                        status={row.interviewStatus}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {canInterview && row.interviewStatus === "scheduled" ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => setCompleting(row)}>
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                            Complete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => {
                              startTransition(async () => {
                                const result = await cancelInterviewAction(row.id);
                                if (!result.success) toast.error(result.message);
                                else {
                                  toast.success("Interview cancelled");
                                  router.refresh();
                                }
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : row.rating ? (
                        <span className="text-xs text-muted-foreground">
                          Rating {row.rating}/5 · {row.recommendation
                            ? RECOMMENDATION_LABELS[row.recommendation]
                            : ""}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RecruitmentPagination page={page} pageSize={pageSize} total={total} />

      {completing ? (
        <CompleteInterviewModal
          open={!!completing}
          onOpenChange={(open) => !open && setCompleting(null)}
          interview={completing}
        />
      ) : null}
    </div>
  );
}

function CompleteInterviewModal({
  open,
  onOpenChange,
  interview,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interview: InterviewListItem;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof interviewCompleteSchema>>({
    resolver: zodResolver(interviewCompleteSchema),
    defaultValues: {
      interviewId: interview.id,
      rating: 3,
      comments: "",
      recommendation: "next_round",
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Complete Interview"
      description={`${interview.candidateName} — ${interview.roundName}`}
      contentClassName="sm:max-w-lg"
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await completeInterviewAction(values);
              if (!result.success) toast.error(result.message);
              else {
                toast.success("Interview completed");
                onOpenChange(false);
                router.refresh();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Save Feedback
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Rating (1-5)">
          <Input type="number" min={1} max={5} disabled={isPending} {...form.register("rating")} />
        </Field>
        <Field label="Comments">
          <Input disabled={isPending} {...form.register("comments")} />
        </Field>
        <Field label="Recommendation">
          <LabeledSelect
            items={toSelectItems(RECOMMENDATION_LABELS)}
            value={form.watch("recommendation")}
            onValueChange={(v) =>
              form.setValue(
                "recommendation",
                v as z.input<typeof interviewCompleteSchema>["recommendation"],
              )
            }
            disabled={isPending}
          />
        </Field>
      </div>
    </Modal>
  );
}
