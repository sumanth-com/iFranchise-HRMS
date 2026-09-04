"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  releaseEmployeePayslipAction,
  updatePayrollItemAdjustmentsAction,
} from "@/lib/payroll/actions";
import { formatCurrency, roundCurrency } from "@/lib/payroll/services/payroll-utils";
import type { HrPayrollAdjustments } from "@/types/payroll";

type PayrollLineTarget = {
  payrollItemId: string;
  employeeName: string;
  employeeCode: string;
  netPay: number;
  periodLabel: string;
  payslipSent?: boolean;
  adjustments?: HrPayrollAdjustments;
  currentBonus?: number;
  currentIncentive?: number;
  currentReimbursement?: number;
};

export function PayrollEditDialog({
  target,
  open,
  onOpenChange,
  onSaved,
}: {
  target: PayrollLineTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (saved: {
    bonus: number;
    incentive: number;
    reimbursement: number;
  }) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [bonus, setBonus] = useState("0");
  const [incentive, setIncentive] = useState("0");
  const [reimbursements, setReimbursements] = useState("0");

  useEffect(() => {
    if (!open || !target) return;
    const adj = target.adjustments;
    setBonus(String(target.currentBonus ?? adj?.bonus ?? 0));
    setIncentive(String(target.currentIncentive ?? adj?.incentive ?? 0));
    setReimbursements(String(target.currentReimbursement ?? adj?.reimbursements ?? 0));
    setConfirmReopen(false);
  }, [open, target]);

  const bonusPreview = Math.max(0, Number(bonus) || 0);
  const incentivePreview = Math.max(0, Number(incentive) || 0);
  const reimbursementPreview = Math.max(0, Number(reimbursements) || 0);
  const finalPayablePreview = roundCurrency(
    (target?.netPay ?? 0) + bonusPreview + incentivePreview + reimbursementPreview,
  );

  function handleSave() {
    if (!target) return;
    startTransition(async () => {
      const result = await updatePayrollItemAdjustmentsAction({
        payrollItemId: target.payrollItemId,
        bonus: bonusPreview,
        incentive: incentivePreview,
        reimbursements: reimbursementPreview,
        additionalEarnings: 0,
        additionalDeductions: 0,
        tdsOverride: null,
        otherDeductionsOverride: null,
        lopDaysOverride: null,
        confirmReopen: target.payslipSent ? confirmReopen : false,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Payroll changes saved");
      onOpenChange(false);
      onSaved({
        bonus: bonusPreview,
        incentive: incentivePreview,
        reimbursement: reimbursementPreview,
      });
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,520px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4 pr-12 text-left">
          <DialogTitle>Edit payroll</DialogTitle>
          <DialogDescription>
            {target
              ? `${target.employeeName} · ${target.employeeCode} · ${target.periodLabel}`
              : "Manual adjustments"}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-xs text-muted-foreground">
            Add manual bonus, incentive, or reimbursement. Attendance-based salary and deductions
            are not changed.
          </p>
          <div className="grid gap-3">
            <Field label="Bonus" value={bonus} onChange={setBonus} disabled={isPending} />
            <Field label="Incentive" value={incentive} onChange={setIncentive} disabled={isPending} />
            <Field
              label="Reimbursement"
              value={reimbursements}
              onChange={setReimbursements}
              disabled={isPending}
            />
          </div>
          {target ? (
            <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
                <span className="text-muted-foreground">Net salary</span>
                <span className="font-semibold">{formatCurrency(target.netPay)}</span>
                <span className="text-muted-foreground">+ Bonus</span>
                <span className="font-semibold">{formatCurrency(bonusPreview)}</span>
                <span className="text-muted-foreground">+ Incentive</span>
                <span className="font-semibold">{formatCurrency(incentivePreview)}</span>
                <span className="text-muted-foreground">+ Reimbursement</span>
                <span className="font-semibold">{formatCurrency(reimbursementPreview)}</span>
                <span className="text-muted-foreground">= Final payable</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(finalPayablePreview)}
                </span>
              </div>
            </div>
          ) : null}
          {target?.payslipSent ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={confirmReopen}
                onChange={(event) => setConfirmReopen(event.target.checked)}
              />
              Reopen this sent payslip and update the payroll line.
            </label>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSave}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PayrollSendPayslipDialog({
  target,
  open,
  onOpenChange,
  onSent,
}: {
  target: PayrollLineTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    if (!target) return;
    startTransition(async () => {
      const result = await releaseEmployeePayslipAction(target.payrollItemId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(
        result.data?.emailed === false
          ? "Payslip released to the employee portal. Email could not be delivered."
          : "Payslip sent successfully. The employee can now view it in their portal.",
      );
      onOpenChange(false);
      onSent();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4 pr-12 text-left">
          <DialogTitle>Send Payslip</DialogTitle>
          <DialogDescription>
            Release the payslip for {target?.periodLabel ?? "this period"}?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 px-5 py-4 text-sm">
          <p className="font-medium">{target?.employeeName}</p>
          <p className="text-muted-foreground">{target?.employeeCode}</p>
          <p>
            Net Pay:{" "}
            <span className="font-semibold">{formatCurrency(target?.netPay ?? 0)}</span>
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isPending} onClick={handleSend}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Send Payslip
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
