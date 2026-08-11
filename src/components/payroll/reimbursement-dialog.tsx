"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReimbursementForm } from "@/components/payroll/reimbursement-management";
import type { LookupOption } from "@/types/employee";

type ReimbursementDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: LookupOption[];
  onSaved?: () => void;
};

export function ReimbursementDialog({
  open,
  onOpenChange,
  employees,
  onSaved,
}: ReimbursementDialogProps) {
  function handleSaved() {
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,640px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-lg font-semibold">Submit expense claim</DialogTitle>
          <DialogDescription className="text-sm">
            Record an employee expense for reimbursement. Approved claims are included in the next
            payroll run.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <ReimbursementForm
            key={open ? "open" : "closed"}
            employees={employees}
            variant="dialog"
            onSuccess={handleSaved}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
