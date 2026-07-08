"use client";

import { format } from "date-fns";
import {
  Check,
  Eye,
  Loader2,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Undo2,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import {
  getResignationDetailAction,
  hrDecideResignationAction,
  managerDecideResignationAction,
  submitResignationAction,
  withdrawResignationAction,
} from "@/lib/exit/actions";
import {
  canApproveExit,
  canCreateExit,
  EXIT_REASON_OPTIONS,
  EXIT_ROUTES,
  EXIT_STATUS_LABELS,
} from "@/lib/exit/constants";
import { addDaysIso } from "@/lib/exit/services/exit-utils";
import {
  resignationDecisionSchema,
  resignationFormSchema,
  type ResignationDecisionValues,
  type ResignationFormValues,
} from "@/lib/validations/exit";
import type {
  ExitListResult,
  ExitLookups,
  ExitResignationItem,
  ExitStatus,
  ExitTimelineItem,
} from "@/types/exit";

type Props = {
  result: ExitListResult;
  lookups: ExitLookups;
  permissionCodes: string[];
  currentEmployeeId: string;
  isSelfOnly: boolean;
  isHrAdmin: boolean;
  defaultNoticePeriodDays: number;
};

type ModalMode =
  | "submit"
  | "manager"
  | "hr"
  | "timeline"
  | null;

type DecisionFormInput = {
  resignationId: string;
  decision: "approve" | "reject";
  remarks: string | null;
  rejectedReason: string | null;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function statusBadgeClass(status: ExitStatus) {
  if (status === "completed") return "bg-emerald-500/10 text-emerald-700";
  if (status === "rejected" || status === "withdrawn") return "bg-destructive/10 text-destructive";
  if (status === "submitted" || status === "manager_approved") {
    return "bg-amber-500/10 text-amber-700";
  }
  return "bg-muted text-foreground";
}

export function ResignationsManagement({
  result,
  lookups,
  permissionCodes,
  currentEmployeeId,
  isSelfOnly,
  isHrAdmin,
  defaultNoticePeriodDays,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<ModalMode>(null);
  const [selected, setSelected] = useState<ExitResignationItem | null>(null);
  const [timeline, setTimeline] = useState<ExitTimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [decisionType, setDecisionType] = useState<"approve" | "reject">("approve");

  const canCreate = canCreateExit(permissionCodes);
  const canApprove = canApproveExit(permissionCodes);

  const submitForm = useForm<ResignationFormValues>({
    resolver: zodResolver(resignationFormSchema) as never,
    defaultValues: {
      employeeId: isSelfOnly ? currentEmployeeId : "",
      resignationDate: todayIso(),
      lastWorkingDay: addDaysIso(todayIso(), defaultNoticePeriodDays),
      noticePeriodDays: defaultNoticePeriodDays,
      reason: EXIT_REASON_OPTIONS[0],
      comments: null,
    },
  });

  const decisionForm = useForm<DecisionFormInput>({
    resolver: zodResolver(resignationDecisionSchema) as never,
    defaultValues: {
      resignationId: "",
      decision: "approve",
      remarks: null,
      rejectedReason: null,
    },
  });

  const resignationDate = submitForm.watch("resignationDate");
  const noticePeriodDays = submitForm.watch("noticePeriodDays");

  function updateParams(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    if (!patch.page) params.delete("page");
    startTransition(() => {
      router.push(`${EXIT_ROUTES.resignations}?${params.toString()}`);
    });
  }

  function openSubmit() {
    const resignationDateValue = todayIso();
    submitForm.reset({
      employeeId: isSelfOnly ? currentEmployeeId : "",
      resignationDate: resignationDateValue,
      lastWorkingDay: addDaysIso(resignationDateValue, defaultNoticePeriodDays),
      noticePeriodDays: defaultNoticePeriodDays,
      reason: EXIT_REASON_OPTIONS[0],
      comments: null,
    });
    setMode("submit");
  }

  const openDecision = useCallback(
    (row: ExitResignationItem, actor: "manager" | "hr", decision: "approve" | "reject") => {
      setSelected(row);
      setDecisionType(decision);
      decisionForm.reset({
        resignationId: row.id,
        decision,
        remarks: null,
        rejectedReason: decision === "reject" ? "" : null,
      });
      setMode(actor);
    },
    [decisionForm],
  );

  const openTimeline = useCallback((row: ExitResignationItem) => {
    setSelected(row);
    setTimeline([]);
    setMode("timeline");
    setTimelineLoading(true);
    void getResignationDetailAction(row.id).then((res) => {
      setTimelineLoading(false);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setTimeline(res.data?.timeline ?? []);
    });
  }, []);

  function onSubmitResignation(values: ResignationFormValues) {
    startTransition(async () => {
      const res = await submitResignationAction(values);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Resignation submitted");
      setMode(null);
      router.refresh();
    });
  }

  function onDecision(values: DecisionFormInput) {
    const payload: ResignationDecisionValues = {
      resignationId: values.resignationId,
      decision: values.decision,
      remarks: values.remarks,
      rejectedReason: values.decision === "reject" ? values.rejectedReason : null,
    };
    startTransition(async () => {
      const action =
        mode === "manager" ? managerDecideResignationAction : hrDecideResignationAction;
      const res = await action(payload);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(
        values.decision === "approve" ? "Resignation approved" : "Resignation rejected",
      );
      setMode(null);
      router.refresh();
    });
  }

  function onWithdraw(row: ExitResignationItem) {
    startTransition(async () => {
      const res = await withdrawResignationAction(row.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Resignation withdrawn");
      router.refresh();
    });
  }

  const columns = useMemo<
    DataTableColumn<ExitResignationItem & Record<string, unknown>>[]
  >(
    () => [
      {
        key: "employeeName",
        header: "Employee",
        render: (row) => (
          <div>
            <p className="font-medium">{row.employeeName}</p>
            <p className="text-xs text-muted-foreground">
              {row.employeeCode}
              {row.departmentName ? ` · ${row.departmentName}` : ""}
            </p>
          </div>
        ),
      },
      {
        key: "resignationDate",
        header: "Resignation",
        render: (row) => format(new Date(row.resignationDate), "dd MMM yyyy"),
      },
      {
        key: "lastWorkingDay",
        header: "Last Working Day",
        render: (row) => format(new Date(row.lastWorkingDay), "dd MMM yyyy"),
      },
      {
        key: "noticePeriodDays",
        header: "Notice",
        render: (row) => `${row.noticePeriodDays} days`,
      },
      {
        key: "reason",
        header: "Reason",
        render: (row) => (
          <span className="line-clamp-2 max-w-[180px] text-sm">{row.reason}</span>
        ),
      },
      {
        key: "exitStatus",
        header: "Status",
        render: (row) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.exitStatus)}`}
          >
            {EXIT_STATUS_LABELS[row.exitStatus]}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => {
          const terminal = ["completed", "rejected", "withdrawn"].includes(row.exitStatus);
          const showManager =
            canApprove && !isHrAdmin && row.exitStatus === "submitted";
          const showHr =
            canApprove &&
            isHrAdmin &&
            (row.exitStatus === "submitted" || row.exitStatus === "manager_approved");
          const showWithdraw =
            (canCreate || canApprove) && !terminal;

          return (
            <div className="flex flex-wrap gap-1">
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => openTimeline(row)}
                aria-label="View timeline"
                title="View timeline"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {showManager ? (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openDecision(row, "manager", "approve")}
                    aria-label="Approve"
                    title="Manager approve"
                  >
                    <ThumbsUp className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openDecision(row, "manager", "reject")}
                    aria-label="Reject"
                    title="Manager reject"
                  >
                    <ThumbsDown className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              ) : null}
              {showHr ? (
                <>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openDecision(row, "hr", "approve")}
                    aria-label="HR approve"
                    title="HR approve"
                  >
                    <Check className="h-4 w-4 text-emerald-600" />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => openDecision(row, "hr", "reject")}
                    aria-label="HR reject"
                    title="HR reject"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              ) : null}
              {showWithdraw ? (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => onWithdraw(row)}
                  aria-label="Withdraw"
                  title="Withdraw"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [canApprove, canCreate, isHrAdmin, isPending, openDecision, openTimeline],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resignations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit, review, and track employee resignations through the exit pipeline.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openSubmit}>
            <Plus className="mr-2 h-4 w-4" />
            Submit Resignation
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <Input
          placeholder="Search by reason…"
          defaultValue={searchParams.get("search") ?? ""}
          onBlur={(e) => updateParams({ search: e.target.value || undefined })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateParams({ search: (e.target as HTMLInputElement).value || undefined });
            }
          }}
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All statuses" },
            ...Object.entries(EXIT_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
          value={searchParams.get("exitStatus") || "__all__"}
          onValueChange={(value) =>
            updateParams({ exitStatus: value === "__all__" ? undefined : value })
          }
          placeholder="Status"
        />
        <LabeledSelect
          items={[
            { value: "__all__", label: "All departments" },
            ...lookups.departments.map((d) => ({ value: d.id, label: d.label })),
          ]}
          value={searchParams.get("departmentId") || "__all__"}
          onValueChange={(value) =>
            updateParams({ departmentId: value === "__all__" ? undefined : value })
          }
          placeholder="Department"
        />
      </div>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      ) : null}

      {result.data.length === 0 ? (
        <EmptyState
          title="No resignations found"
          description="Submit a resignation to start the exit process."
        />
      ) : (
        <DataTable columns={columns} data={result.data} />
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {result.page} · {result.total} resignations
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={result.page <= 1 || isPending}
            onClick={() => updateParams({ page: String(result.page - 1) })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={result.page * result.pageSize >= result.total || isPending}
            onClick={() => updateParams({ page: String(result.page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        open={mode === "submit"}
        onOpenChange={(open) => !open && setMode(null)}
        title="Submit Resignation"
        description="Provide resignation details and preferred last working day."
        contentClassName="sm:max-w-lg"
        footer={
          <Button
            disabled={isPending}
            onClick={submitForm.handleSubmit(onSubmitResignation)}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <EmployeeSelect
              employees={lookups.employees.map((e) => ({ id: e.id, label: e.label }))}
              value={submitForm.watch("employeeId")}
              onValueChange={(value) =>
                submitForm.setValue("employeeId", value, { shouldValidate: true })
              }
              disabled={isSelfOnly || isPending}
            />
            {submitForm.formState.errors.employeeId ? (
              <p className="text-xs text-destructive">
                {submitForm.formState.errors.employeeId.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Resignation Date</Label>
              <Input
                type="date"
                disabled={isPending}
                {...submitForm.register("resignationDate")}
                onChange={(e) => {
                  submitForm.setValue("resignationDate", e.target.value, {
                    shouldValidate: true,
                  });
                  const days = Number(submitForm.getValues("noticePeriodDays")) || 0;
                  if (e.target.value) {
                    submitForm.setValue("lastWorkingDay", addDaysIso(e.target.value, days));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Notice Period (days)</Label>
              <Input
                type="number"
                min={0}
                disabled={isPending}
                {...submitForm.register("noticePeriodDays")}
                onChange={(e) => {
                  const days = Number(e.target.value) || 0;
                  submitForm.setValue("noticePeriodDays", days, { shouldValidate: true });
                  const date = submitForm.getValues("resignationDate");
                  if (date) {
                    submitForm.setValue("lastWorkingDay", addDaysIso(date, days));
                  }
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Last Working Day</Label>
            <Input
              type="date"
              disabled={isPending}
              {...submitForm.register("lastWorkingDay")}
            />
            <p className="text-xs text-muted-foreground">
              Suggested from resignation date + notice ({resignationDate} + {noticePeriodDays}{" "}
              days).
            </p>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <LabeledSelect
              items={EXIT_REASON_OPTIONS.map((r) => ({ value: r, label: r }))}
              value={submitForm.watch("reason")}
              onValueChange={(value) =>
                submitForm.setValue("reason", value, { shouldValidate: true })
              }
              disabled={isPending}
              placeholder="Select reason"
            />
          </div>
          <div className="space-y-2">
            <Label>Comments</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={isPending}
              {...submitForm.register("comments")}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={mode === "manager" || mode === "hr"}
        onOpenChange={(open) => !open && setMode(null)}
        title={
          decisionType === "approve"
            ? mode === "hr"
              ? "HR Approve Resignation"
              : "Manager Approve Resignation"
            : mode === "hr"
              ? "HR Reject Resignation"
              : "Manager Reject Resignation"
        }
        description={
          selected
            ? `${selected.employeeName} · ${EXIT_STATUS_LABELS[selected.exitStatus]}`
            : undefined
        }
        footer={
          <Button
            disabled={isPending}
            variant={decisionType === "reject" ? "destructive" : "default"}
            onClick={decisionForm.handleSubmit(onDecision)}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {decisionType === "approve" ? "Approve" : "Reject"}
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Remarks</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={isPending}
              {...decisionForm.register("remarks")}
            />
          </div>
          {decisionType === "reject" ? (
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <textarea
                className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                disabled={isPending}
                {...decisionForm.register("rejectedReason")}
              />
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={mode === "timeline"}
        onOpenChange={(open) => !open && setMode(null)}
        title="Resignation Timeline"
        description={
          selected
            ? `${selected.employeeName} · ${EXIT_STATUS_LABELS[selected.exitStatus]}`
            : undefined
        }
        showCancel
        contentClassName="sm:max-w-lg"
      >
        {timelineLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading timeline…
          </div>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline events yet.</p>
        ) : (
          <div className="space-y-4">
            {timeline.map((item) => (
              <div key={item.id} className="relative border-l-2 border-muted pl-4">
                <p className="text-sm font-medium">{item.title}</p>
                {item.description ? (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(item.createdAt), "dd MMM yyyy, HH:mm")}
                </p>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
