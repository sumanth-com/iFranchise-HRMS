"use client";

import { format } from "date-fns";
import { Loader2, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { saveExitInterviewAction } from "@/lib/exit/actions";
import { EXIT_STATUS_LABELS } from "@/lib/exit/constants";
import {
  interviewFormSchema,
  type InterviewFormValues,
} from "@/lib/validations/exit";
import type { ExitResignationItem } from "@/types/exit";

type Props = {
  queue: ExitResignationItem[];
  permissionCodes: string[];
  isHrAdmin: boolean;
};

type InterviewFormInput = {
  resignationId: string;
  reasonForLeaving: string | null;
  managerRating: number | null;
  workEnvironmentRating: number | null;
  salarySatisfactionRating: number | null;
  growthOpportunitiesRating: number | null;
  companyCultureRating: number | null;
  suggestions: string | null;
  overallRating: number | null;
  hrPrivateNotes: string | null;
};

const RATING_ITEMS = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: `${n}`,
}));

const RATING_FIELDS = [
  { key: "managerRating" as const, label: "Manager rating" },
  { key: "workEnvironmentRating" as const, label: "Work environment" },
  { key: "salarySatisfactionRating" as const, label: "Salary satisfaction" },
  { key: "growthOpportunitiesRating" as const, label: "Growth opportunities" },
  { key: "companyCultureRating" as const, label: "Company culture" },
  { key: "overallRating" as const, label: "Overall rating" },
];

export function InterviewManagement({ queue, permissionCodes, isHrAdmin }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExitResignationItem | null>(null);

  const canSave =
    permissionCodes.includes("exit.approve") ||
    permissionCodes.includes("exit.create") ||
    permissionCodes.includes("exit.settlement");

  const interviewQueue = useMemo(
    () =>
      queue.filter(
        (r) =>
          r.exitStatus === "interview" ||
          r.exitStatus === "documents" ||
          r.exitStatus === "completed" ||
          Boolean(r.interview),
      ),
    [queue],
  );

  const form = useForm<InterviewFormInput>({
    resolver: zodResolver(interviewFormSchema) as never,
    defaultValues: {
      resignationId: "",
      reasonForLeaving: null,
      managerRating: null,
      workEnvironmentRating: null,
      salarySatisfactionRating: null,
      growthOpportunitiesRating: null,
      companyCultureRating: null,
      suggestions: null,
      overallRating: null,
      hrPrivateNotes: null,
    },
  });

  function openForm(row: ExitResignationItem) {
    const i = row.interview;
    setEditing(row);
    form.reset({
      resignationId: row.id,
      reasonForLeaving: i?.reasonForLeaving ?? null,
      managerRating: i?.managerRating ?? null,
      workEnvironmentRating: i?.workEnvironmentRating ?? null,
      salarySatisfactionRating: i?.salarySatisfactionRating ?? null,
      growthOpportunitiesRating: i?.growthOpportunitiesRating ?? null,
      companyCultureRating: i?.companyCultureRating ?? null,
      suggestions: i?.suggestions ?? null,
      overallRating: i?.overallRating ?? null,
      hrPrivateNotes: i?.hrPrivateNotes ?? null,
    });
    setOpen(true);
  }

  function onSave(values: InterviewFormInput) {
    const payload: InterviewFormValues = {
      ...values,
      managerRating: values.managerRating ? Number(values.managerRating) : null,
      workEnvironmentRating: values.workEnvironmentRating
        ? Number(values.workEnvironmentRating)
        : null,
      salarySatisfactionRating: values.salarySatisfactionRating
        ? Number(values.salarySatisfactionRating)
        : null,
      growthOpportunitiesRating: values.growthOpportunitiesRating
        ? Number(values.growthOpportunitiesRating)
        : null,
      companyCultureRating: values.companyCultureRating
        ? Number(values.companyCultureRating)
        : null,
      overallRating: values.overallRating ? Number(values.overallRating) : null,
    };
    startTransition(async () => {
      const res = await saveExitInterviewAction(payload);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Exit interview saved");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Exit Interview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture feedback, ratings, and HR notes for departing employees.
        </p>
      </div>

      {interviewQueue.length === 0 ? (
        <EmptyState
          title="No exit interviews"
          description="Interviews appear when resignations reach the interview stage."
        />
      ) : (
        <div className="space-y-4">
          {interviewQueue.map((row) => (
            <section key={row.id} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{row.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.employeeCode}
                    {row.departmentName ? ` · ${row.departmentName}` : ""}
                    {" · "}
                    LWD {format(new Date(row.lastWorkingDay), "dd MMM yyyy")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {EXIT_STATUS_LABELS[row.exitStatus]}
                    {row.interview?.conductedAt
                      ? ` · Conducted ${format(new Date(row.interview.conductedAt), "dd MMM yyyy")}`
                      : " · Not conducted"}
                  </p>
                  {row.interview?.overallRating ? (
                    <p className="mt-1 text-sm">
                      Overall rating:{" "}
                      <span className="font-medium">{row.interview.overallRating}/5</span>
                    </p>
                  ) : null}
                </div>
                {canSave ? (
                  <Button size="sm" variant="outline" onClick={() => openForm(row)}>
                    <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                    {row.interview ? "Edit interview" : "Conduct interview"}
                  </Button>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Exit Interview"
        description={
          editing ? `${editing.employeeName} · ${editing.employeeCode}` : undefined
        }
        contentClassName="sm:max-w-xl"
        footer={
          <Button disabled={isPending} onClick={form.handleSubmit(onSave)}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Interview
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Reason for leaving</Label>
            <textarea
              className="min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={isPending}
              {...form.register("reasonForLeaving")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {RATING_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <LabeledSelect
                  items={[{ value: "__none__", label: "—" }, ...RATING_ITEMS]}
                  value={
                    form.watch(key) != null ? String(form.watch(key)) : "__none__"
                  }
                  onValueChange={(value) =>
                    form.setValue(key, value === "__none__" ? null : Number(value), {
                      shouldValidate: true,
                    })
                  }
                  disabled={isPending}
                  placeholder={label}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Suggestions</Label>
            <textarea
              className="min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={isPending}
              {...form.register("suggestions")}
            />
          </div>

          {isHrAdmin ? (
            <div className="space-y-2">
              <Label>HR private notes</Label>
              <textarea
                className="min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                disabled={isPending}
                {...form.register("hrPrivateNotes")}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
