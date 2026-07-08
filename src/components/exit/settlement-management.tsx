"use client";

import { format } from "date-fns";
import { Check, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { approveSettlementAction, saveSettlementAction } from "@/lib/exit/actions";
import {
  canSettlementExit,
  EXIT_STATUS_LABELS,
  SETTLEMENT_STATUS_LABELS,
} from "@/lib/exit/constants";
import { formatCurrencyInr } from "@/lib/exit/services/exit-utils";
import {
  settlementFormSchema,
  type SettlementFormValues,
} from "@/lib/validations/exit";
import type { ExitResignationItem, ExitSettlementStatus } from "@/types/exit";

type Props = {
  queue: ExitResignationItem[];
  permissionCodes: string[];
};

type SettlementFormInput = {
  resignationId: string;
  pendingSalary: number;
  leaveEncashment: number;
  bonus: number;
  reimbursements: number;
  deductions: number;
  assetDamageRecovery: number;
  leaveBalanceDays: number;
  notes: string | null;
};

function settlementBadgeClass(status: ExitSettlementStatus) {
  if (status === "approved" || status === "paid") {
    return "bg-emerald-500/10 text-emerald-700";
  }
  if (status === "pending") return "bg-amber-500/10 text-amber-700";
  return "bg-muted text-foreground";
}

function computeNet(values: {
  pendingSalary: number;
  leaveEncashment: number;
  bonus: number;
  reimbursements: number;
  deductions: number;
  assetDamageRecovery: number;
}) {
  return (
    Number(values.pendingSalary || 0) +
    Number(values.leaveEncashment || 0) +
    Number(values.bonus || 0) +
    Number(values.reimbursements || 0) -
    Number(values.deductions || 0) -
    Number(values.assetDamageRecovery || 0)
  );
}

export function SettlementManagement({ queue, permissionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExitResignationItem | null>(null);

  const canEdit = canSettlementExit(permissionCodes);

  const settlementQueue = useMemo(
    () =>
      queue.filter((r) =>
        ["settlement", "interview", "documents", "completed", "asset_return"].includes(
          r.exitStatus,
        ),
      ),
    [queue],
  );

  const form = useForm<SettlementFormInput>({
    resolver: zodResolver(settlementFormSchema) as never,
    defaultValues: {
      resignationId: "",
      pendingSalary: 0,
      leaveEncashment: 0,
      bonus: 0,
      reimbursements: 0,
      deductions: 0,
      assetDamageRecovery: 0,
      leaveBalanceDays: 0,
      notes: null,
    },
  });

  const watched = form.watch();
  const liveNet = computeNet(watched);

  function openEdit(row: ExitResignationItem) {
    const s = row.settlement;
    setEditing(row);
    form.reset({
      resignationId: row.id,
      pendingSalary: s?.pendingSalary ?? 0,
      leaveEncashment: s?.leaveEncashment ?? 0,
      bonus: s?.bonus ?? 0,
      reimbursements: s?.reimbursements ?? 0,
      deductions: s?.deductions ?? 0,
      assetDamageRecovery: s?.assetDamageRecovery ?? 0,
      leaveBalanceDays: s?.leaveBalanceDays ?? 0,
      notes: s?.notes ?? null,
    });
    setOpen(true);
  }

  function onSave(values: SettlementFormInput) {
    const payload: SettlementFormValues = values;
    startTransition(async () => {
      const res = await saveSettlementAction(payload);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Settlement saved");
      setOpen(false);
      router.refresh();
    });
  }

  function onApprove(resignationId: string) {
    startTransition(async () => {
      const res = await approveSettlementAction(resignationId);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Settlement approved");
      router.refresh();
    });
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settlement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Calculate final dues, recoveries, and approve full & final settlement.
        </p>
      </div>

      {settlementQueue.length === 0 ? (
        <EmptyState
          title="No settlements"
          description="Settlements appear after clearance and asset return stages."
        />
      ) : (
        <div className="space-y-4">
          {settlementQueue.map((row) => {
            const s = row.settlement;
            const canApprove =
              canEdit &&
              s &&
              (s.settlementStatus === "draft" || s.settlementStatus === "pending");

            return (
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
                      Exit: {EXIT_STATUS_LABELS[row.exitStatus]}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {s ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${settlementBadgeClass(s.settlementStatus)}`}
                      >
                        {SETTLEMENT_STATUS_LABELS[s.settlementStatus]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        Not started
                      </span>
                    )}
                    {canEdit ? (
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                        Edit
                      </Button>
                    ) : null}
                    {canApprove ? (
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => onApprove(row.id)}
                      >
                        {isPending ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Approve
                      </Button>
                    ) : null}
                  </div>
                </div>

                {s ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">Pending salary</p>
                      <p className="font-medium">{formatCurrencyInr(s.pendingSalary)}</p>
                    </div>
                    <div className="rounded-lg border px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">Leave encashment</p>
                      <p className="font-medium">{formatCurrencyInr(s.leaveEncashment)}</p>
                    </div>
                    <div className="rounded-lg border px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">Deductions + recovery</p>
                      <p className="font-medium">
                        {formatCurrencyInr(s.deductions + s.assetDamageRecovery)}
                      </p>
                    </div>
                    <div className="rounded-lg border px-3 py-2 text-sm">
                      <p className="text-xs text-muted-foreground">Net payable</p>
                      <p className="font-semibold text-emerald-700">
                        {formatCurrencyInr(s.netPayable)}
                      </p>
                    </div>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Edit Settlement"
        description={
          editing
            ? `${editing.employeeName} · ${editing.employeeCode}`
            : undefined
        }
        contentClassName="sm:max-w-xl"
        footer={
          <Button disabled={isPending} onClick={form.handleSubmit(onSave)}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Settlement
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["pendingSalary", "Pending salary"],
                ["leaveEncashment", "Leave encashment"],
                ["bonus", "Bonus"],
                ["reimbursements", "Reimbursements"],
                ["deductions", "Deductions"],
                ["assetDamageRecovery", "Asset damage recovery"],
                ["leaveBalanceDays", "Leave balance (days)"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-2">
                <Label>{label}</Label>
                <Input
                  type="number"
                  min={0}
                  step={field === "leaveBalanceDays" ? "0.5" : "0.01"}
                  disabled={isPending}
                  {...form.register(field)}
                />
              </div>
            ))}
          </div>
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Net payable: </span>
            <span className="font-semibold">{formatCurrencyInr(liveNet)}</span>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              disabled={isPending}
              {...form.register("notes")}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
