"use client";

import { useState, useTransition } from "react";
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
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { HrPayrollAdjustments } from "@/types/payroll";

type PayrollLineTarget = {
  payrollItemId: string;
  employeeName: string;
  employeeCode: string;
  netPay: number;
  periodLabel: string;
  payslipSent?: boolean;
  adjustments?: HrPayrollAdjustments;
  systemGross?: number;
  systemLop?: number;
  systemPf?: number;
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
  onSaved: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmReopen, setConfirmReopen] = useState(false);
  const existing = target?.adjustments;
  const [bonus, setBonus] = useState(String(existing?.bonus ?? 0));
  const [incentive, setIncentive] = useState(String(existing?.incentive ?? 0));
  const [additionalEarnings, setAdditionalEarnings] = useState(
    String(existing?.additionalEarnings ?? 0),
  );
  const [reimbursements, setReimbursements] = useState(String(existing?.reimbursements ?? 0));
  const [additionalDeductions, setAdditionalDeductions] = useState(
    String(existing?.additionalDeductions ?? 0),
  );
  const [tds, setTds] = useState(
    existing?.tdsOverride != null ? String(existing.tdsOverride) : "",
  );
  const [otherDeduction, setOtherDeduction] = useState(
    existing?.otherDeductionsOverride != null
      ? String(existing.otherDeductionsOverride)
      : "",
  );
  const [lopDays, setLopDays] = useState(
    existing?.lopDaysOverride != null ? String(existing.lopDaysOverride) : "",
  );

  function handleSave() {
    if (!target) return;
    startTransition(async () => {
      const result = await updatePayrollItemAdjustmentsAction({
        payrollItemId: target.payrollItemId,
        additionalEarnings: Number(additionalEarnings) || 0,
        bonus: Number(bonus) || 0,
        incentive: Number(incentive) || 0,
        reimbursements: Number(reimbursements) || 0,
        additionalDeductions: Number(additionalDeductions) || 0,
        tdsOverride: tds === "" ? null : Number(tds),
        otherDeductionsOverride: otherDeduction === "" ? null : Number(otherDeduction),
        lopDaysOverride: lopDays === "" ? null : Number(lopDays),
        confirmReopen: target.payslipSent ? confirmReopen : false,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Payroll changes saved");
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(88vh,640px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4 pr-12 text-left">
          <DialogTitle>Edit payroll</DialogTitle>
          <DialogDescription>
            {target ? `${target.employeeName} · ${target.employeeCode}` : "Adjustments"}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-xs text-muted-foreground">
            Salary structure amounts stay as calculated. Add HR adjustments only.
          </p>
          {target ? (
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
              <p className="font-medium uppercase tracking-wide text-muted-foreground">
                System calculated
              </p>
              <p className="mt-1 tabular-nums">
                Gross {formatCurrency(target.systemGross ?? target.netPay)} · LOP days{" "}
                {target.systemLop ?? 0} · PF {formatCurrency(target.systemPf ?? 0)}
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bonus" value={bonus} onChange={setBonus} disabled={isPending} />
            <Field label="Incentive" value={incentive} onChange={setIncentive} disabled={isPending} />
            <Field
              label="Additional earnings"
              value={additionalEarnings}
              onChange={setAdditionalEarnings}
              disabled={isPending}
            />
            <Field
              label="Reimbursements"
              value={reimbursements}
              onChange={setReimbursements}
              disabled={isPending}
            />
            <Field
              label="TDS override"
              value={tds}
              onChange={setTds}
              disabled={isPending}
              placeholder="Keep calculated"
            />
            <Field
              label="Other deduction override"
              value={otherDeduction}
              onChange={setOtherDeduction}
              disabled={isPending}
              placeholder="Keep calculated"
            />
            <Field
              label="Additional deductions"
              value={additionalDeductions}
              onChange={setAdditionalDeductions}
              disabled={isPending}
            />
            <Field
              label="LOP days override"
              value={lopDays}
              onChange={setLopDays}
              disabled={isPending}
              placeholder="Keep calculated"
            />
          </div>
          {target?.payslipSent ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={confirmReopen}
                onChange={(event) => setConfirmReopen(event.target.checked)}
              />
              Reopen this sent payslip and overwrite the payroll line.
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
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
