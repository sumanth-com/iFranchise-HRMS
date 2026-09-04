"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format, parseISO } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { toEmployeeSelectItems } from "@/components/payroll/select-utils";
import {
  getBankAccountValidationMessage,
  getIfscValidationMessage,
  sanitizeAccountNumber,
  sanitizeIfsc,
} from "@/lib/onboarding/bank-field-utils";
import {
  sanitizeAadhaar,
  sanitizePan,
} from "@/lib/onboarding/identity-field-utils";
import { resolveBankNameFromIfsc } from "@/lib/payroll/services/ifsc-bank-names";
import { upsertEmployeeAccountAction } from "@/lib/payroll/actions";
import type { LookupOption } from "@/types/employee";
import type { EmployeeAccountListItem } from "@/types/employee-accounts";

type EmployeeAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: LookupOption[];
  record?: EmployeeAccountListItem | null;
  presetEmployeeId?: string | null;
  onSaved?: () => void;
};

function formatDobInput(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return format(parseISO(value), "yyyy-MM-dd");
  } catch {
    return value;
  }
}

export function EmployeeAccountDialog({
  open,
  onOpenChange,
  employees,
  record,
  presetEmployeeId,
  onSaved,
}: EmployeeAccountDialogProps) {
  const [isPending, startTransition] = useTransition();
  const isEdit = Boolean(record?.hasBankAccount || record?.hasIdentityDetails);

  const [employeeId, setEmployeeId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmployeeId(record?.employeeId ?? presetEmployeeId ?? "");
    setDateOfBirth(formatDobInput(record?.dateOfBirth));
    setAadhaarNumber(record?.aadhaarNumber ?? "");
    setPanNumber(record?.panNumber ?? "");
    setBankName(record?.bankName ?? "");
    setAccountHolderName(record?.accountHolderName ?? record?.employeeName ?? "");
    setAccountNumber(record?.accountNumber ?? "");
    setIfscCode(record?.ifscCode ?? "");
    setBranchName(record?.branchName ?? "");
  }, [open, record, presetEmployeeId]);

  const employeeItems = useMemo(() => toEmployeeSelectItems(employees), [employees]);

  const derivedBankName = useMemo(() => {
    const resolved = resolveBankNameFromIfsc(ifscCode);
    return resolved ?? bankName;
  }, [ifscCode, bankName]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await upsertEmployeeAccountAction({
        employeeId,
        dateOfBirth: dateOfBirth || null,
        aadhaarNumber: aadhaarNumber || null,
        panNumber: panNumber || null,
        bankName: derivedBankName || bankName || null,
        accountHolderName: accountHolderName || null,
        accountNumber: accountNumber || null,
        ifscCode: ifscCode || null,
        branchName: branchName || null,
        accountType: "salary",
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(isEdit ? "Employee account updated." : "Employee account saved.");
      onOpenChange(false);
      onSaved?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,820px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Update Employee Account" : "Add Employee Account"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Identity and salary bank details used across payroll and payslips.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Employee
              </label>
              <Select
                items={employeeItems}
                value={employeeId}
                disabled={Boolean(record?.employeeId) || isPending}
                onValueChange={(value) => setEmployeeId(value ?? "")}
              >
                <SelectTrigger className="h-10 w-full border-border/80 bg-white font-semibold dark:bg-input">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  {employeeItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Date of Birth
              </label>
              <Input
                type="date"
                value={dateOfBirth}
                disabled={isPending}
                onChange={(event) => setDateOfBirth(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                PAN Number
              </label>
              <Input
                value={panNumber}
                disabled={isPending}
                placeholder="ABCDE1234F"
                onChange={(event) => setPanNumber(sanitizePan(event.target.value))}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Aadhaar Number
              </label>
              <Input
                value={aadhaarNumber}
                disabled={isPending}
                placeholder="12-digit Aadhaar"
                onChange={(event) => setAadhaarNumber(sanitizeAadhaar(event.target.value))}
              />
            </div>

            <div className="sm:col-span-2 border-t border-border/70 pt-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Bank Details</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                IFSC Code
              </label>
              <Input
                value={ifscCode}
                disabled={isPending}
                placeholder="SBIN0001234"
                onChange={(event) => {
                  const next = sanitizeIfsc(event.target.value);
                  setIfscCode(next);
                  const resolved = resolveBankNameFromIfsc(next);
                  if (resolved) setBankName(resolved);
                }}
              />
              {getIfscValidationMessage(ifscCode) ? (
                <p className="mt-1 text-xs text-destructive">
                  {getIfscValidationMessage(ifscCode)}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bank Name
              </label>
              <Input
                value={derivedBankName || bankName}
                disabled={isPending}
                onChange={(event) => setBankName(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Account Holder
              </label>
              <Input
                value={accountHolderName}
                disabled={isPending}
                onChange={(event) => setAccountHolderName(event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Account Number
              </label>
              <Input
                value={accountNumber}
                disabled={isPending}
                inputMode="numeric"
                onChange={(event) => setAccountNumber(sanitizeAccountNumber(event.target.value))}
              />
              {getBankAccountValidationMessage(accountNumber) ? (
                <p className="mt-1 text-xs text-destructive">
                  {getBankAccountValidationMessage(accountNumber)}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bank Branch
              </label>
              <Input
                value={branchName}
                disabled={isPending}
                placeholder="Optional branch name"
                onChange={(event) => setBranchName(event.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !employeeId}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {isEdit ? "Save Changes" : "Add Account"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
