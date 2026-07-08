"use client";

import { LabeledSelect } from "@/components/payroll/payroll-select";
import { getMonthSelectItems, getYearSelectItems } from "@/components/payroll/select-utils";
import { formatPayrollMonth } from "@/lib/payroll/services/payroll-utils";
import { Label } from "@/components/ui/label";

const monthItems = getMonthSelectItems();
const yearItems = getYearSelectItems([2025, 2026, 2027, 2028]);

type BonusMonthPickerProps = {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  disabled?: boolean;
};

export function BonusMonthPicker({
  month,
  year,
  onMonthChange,
  onYearChange,
  disabled,
}: BonusMonthPickerProps) {
  return (
    <div className="space-y-2">
      <Label>Bonus month</Label>
      <div className="grid gap-3 sm:grid-cols-2">
        <LabeledSelect
          items={monthItems}
          value={String(month)}
          onValueChange={(value) => onMonthChange(Number(value))}
          placeholder="Select month"
          disabled={disabled}
        />
        <LabeledSelect
          items={yearItems}
          value={String(year)}
          onValueChange={(value) => onYearChange(Number(value))}
          placeholder="Select year"
          disabled={disabled}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Selected: {formatPayrollMonth(month, year)}
      </p>
    </div>
  );
}
