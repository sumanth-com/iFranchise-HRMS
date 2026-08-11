"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BonusForm } from "@/components/payroll/bonus-management";
import type { LookupOption } from "@/types/employee";

type BonusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: LookupOption[];
  onSaved?: () => void;
};

export function BonusDialog({
  open,
  onOpenChange,
  employees,
  onSaved,
}: BonusDialogProps) {
  function handleSaved() {
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,720px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-lg font-semibold">Add bonus</DialogTitle>
          <DialogDescription className="text-sm">
            Record a one-time bonus for payroll. Submissions follow HR → Finance → Super Admin
            approval before inclusion in the monthly run.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <BonusForm
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
