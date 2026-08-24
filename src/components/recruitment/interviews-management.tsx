"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button, buttonVariants } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { FilterSelect } from "@/components/common/filter-select";
import {
  TABLE_HEADER_CELL_CLASS,
  TABLE_HEADER_STICKY_CLASS,
} from "@/components/common/table-header-classes";
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

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function getYearItems() {
  const current = new Date().getFullYear();
  const items = [];
  for (let y = current; y >= current - 3; y--) {
    items.push({ value: String(y), label: String(y) });
  }
  return items;
}

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
  candidatesHref = RECRUITMENT_ROUTES.candidates,
}: {
  records: InterviewListItem[];
  total: number;
  page: number;
  pageSize: number;
  lookups: RecruitmentLookups;
  canInterview: boolean;
  candidatesHref?: string;
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

  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
  const currentYear = String(now.getFullYear());

  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [yearFilter, setYearFilter] = useState(currentYear);
  const [typeFilter, setTypeFilter] = useState("all");
  const [roundFilter, setRoundFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");

  const roundOptions = useMemo(() => {
    const values = Array.from(
      new Set(records.map((r) => r.roundName).filter((v): v is string => Boolean(v))),
    ).sort((a, b) => a.localeCompare(b));

    return [{ value: "all", label: "All rounds" }, ...values.map((value) => ({ value, label: value }))];
  }, [records]);

  const positionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) {
      if (!r.jobOpeningId) continue;
      map.set(r.jobOpeningId, r.jobTitle);
    }

    const values = Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [{ value: "all", label: "All positions" }, ...values];
  }, [records]);

  const filteredRecords = useMemo(() => {
    let items = [...records];
    const prefix = `${yearFilter}-${monthFilter}`;
    items = items.filter((r) => r.interviewDate.startsWith(prefix));
    if (typeFilter !== "all") {
      items = items.filter((r) => r.interviewType === typeFilter);
    }
    if (roundFilter !== "all") {
      items = items.filter((r) => r.roundName === roundFilter);
    }
    if (positionFilter !== "all") {
      items = items.filter((r) => r.jobOpeningId === positionFilter);
    }
    items.sort((a, b) => {
      const dateA = `${a.interviewDate} ${a.interviewTime}`;
      const dateB = `${b.interviewDate} ${b.interviewTime}`;
      return dateB.localeCompare(dateA);
    });
    return items;
  }, [records, monthFilter, yearFilter, typeFilter, roundFilter, positionFilter]);

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
            href={candidatesHref}
            className={cn(buttonVariants(), "inline-flex items-center")}
          >
            <Users className="mr-1.5 h-4 w-4" />
            Schedule from Candidates
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          className="w-[140px]"
          items={MONTHS}
          value={monthFilter}
          placeholder="Month"
          onValueChange={setMonthFilter}
        />
        <FilterSelect
          className="w-[100px]"
          items={getYearItems()}
          value={yearFilter}
          placeholder="Year"
          onValueChange={setYearFilter}
        />
        <FilterSelect
          className="w-[150px]"
          items={[
            { value: "all", label: "All types" },
            ...toSelectItems(INTERVIEW_TYPE_LABELS),
          ]}
          value={typeFilter}
          placeholder="All types"
          onValueChange={setTypeFilter}
        />
        <FilterSelect
          className="w-[160px]"
          items={roundOptions}
          value={roundFilter}
          placeholder="All rounds"
          onValueChange={setRoundFilter}
        />
        <FilterSelect
          className="w-[190px]"
          items={positionOptions}
          value={positionFilter}
          placeholder="All positions"
          onValueChange={setPositionFilter}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {filteredRecords.length === 0 ? (
          <EmptyState
            title="No interviews"
            description="Schedule interviews from the Candidates page or using the button above."
            className="border-0"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className={TABLE_HEADER_STICKY_CLASS}>
                <tr className="border-white/10 bg-black hover:bg-black">
                  <th className={TABLE_HEADER_CELL_CLASS}>Candidate</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Position</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Round</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Interviewer</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Date & Time</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Type</th>
                  <th className={TABLE_HEADER_CELL_CLASS}>Status</th>
                  <th className={TABLE_HEADER_CELL_CLASS} />
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((row) => (
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

      <RecruitmentPagination page={page} pageSize={pageSize} total={filteredRecords.length} />

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
