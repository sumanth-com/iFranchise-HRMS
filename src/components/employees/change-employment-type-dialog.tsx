"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { changeEmployeeEmploymentTypeAction } from "@/lib/employees/actions";
import { formatEmploymentTypeLabel } from "@/lib/employees/employment-type-display";
import { filterStandardEmploymentTypes } from "@/lib/employees/standard-employment-types";
import type { EmployeeListItem, LookupOption } from "@/types/employee";

export function ChangeEmploymentTypeDialog({
  employee,
  employmentTypes,
  open,
  onOpenChange,
  onSuccess,
}: {
  employee: EmployeeListItem | null;
  employmentTypes: LookupOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [nextTypeId, setNextTypeId] = useState("");

  const standardTypes = useMemo(
    () => filterStandardEmploymentTypes(employmentTypes),
    [employmentTypes],
  );

  const currentTypeLabel = useMemo(
    () => formatEmploymentTypeLabel(employee?.employmentTypeName),
    [employee?.employmentTypeName],
  );

  useEffect(() => {
    if (!open) return;
    setNextTypeId("");
  }, [employee?.id, open]);

  const selectableTypes = useMemo(
    () => standardTypes.filter((type) => type.id !== employee?.employmentTypeId),
    [employee?.employmentTypeId, standardTypes],
  );

  const selectableTypeItems = useMemo(
    () =>
      selectableTypes.map((type) => ({
        value: type.id,
        label: formatEmploymentTypeLabel(type.label),
      })),
    [selectableTypes],
  );

  const handleConfirm = () => {
    if (!employee || !nextTypeId || nextTypeId === employee.employmentTypeId) return;

    startTransition(async () => {
      const result = await changeEmployeeEmploymentTypeAction({
        employeeId: employee.id,
        employmentTypeId: nextTypeId,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(
        `${result.data.fullName} is now ${formatEmploymentTypeLabel(result.data.employmentTypeName)}.`,
      );
      onOpenChange(false);
      onSuccess();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Employment Type</DialogTitle>
          <DialogDescription>
            Updates the employee&apos;s category for policy and directory filters. Historical
            attendance, leave, and payroll records are not modified.
          </DialogDescription>
        </DialogHeader>

        {employee ? (
          <div className="space-y-4 py-1">
            <div className="rounded-lg border bg-muted/20 px-3 py-2.5 text-sm">
              <p className="font-medium text-foreground">{employee.fullName}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground">Current type</p>
                <p className="mt-1 text-sm font-semibold">{currentTypeLabel}</p>
              </div>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="change-employment-type-select"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Change to
                </label>
                <Select
                  items={selectableTypeItems}
                  value={nextTypeId || null}
                  onValueChange={(value) => setNextTypeId(value ?? "")}
                >
                  <SelectTrigger id="change-employment-type-select" className="mt-1 h-10 w-full">
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {selectableTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {formatEmploymentTypeLabel(type.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              isPending ||
              !employee ||
              !nextTypeId ||
              nextTypeId === employee?.employmentTypeId
            }
            onClick={handleConfirm}
          >
            Confirm Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
