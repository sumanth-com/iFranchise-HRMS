"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SalaryStructureForm } from "@/components/payroll/salary-structure-form";
import type { LookupOption } from "@/types/employee";
import type { SalaryStructureItem } from "@/types/payroll";

type SalaryStructureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: LookupOption[];
  employmentTypes?: LookupOption[];
  record?: SalaryStructureItem;
  mode: "create" | "edit";
  onSaved?: () => void;
};

export function SalaryStructureDialog({
  open,
  onOpenChange,
  employees,
  employmentTypes = [],
  record,
  mode,
  onSaved,
}: SalaryStructureDialogProps) {
  const isEdit = mode === "edit" && record;
  const formKey = isEdit ? record.id : "create";

  function handleSaved() {
    onOpenChange(false);
    onSaved?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(92vh,800px)] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="text-lg font-semibold">
            {isEdit ? "Edit Salary Structure" : "Set Salary Structure"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            Enter monthly gross salary. Allowances calculate automatically from the employee
            profile.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <SalaryStructureForm
            key={formKey}
            formId={`salary-structure-form-${formKey}`}
            employees={employees}
            employmentTypes={employmentTypes}
            record={record}
            mode={mode}
            variant="dialog"
            onSuccess={handleSaved}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
