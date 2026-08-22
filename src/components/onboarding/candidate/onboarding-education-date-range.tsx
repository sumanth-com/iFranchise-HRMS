"use client";

import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { todayIsoDate } from "@/lib/onboarding/personal-field-options";
import { cn } from "@/lib/utils";

type EducationDateRangeFieldsProps = {
  label: string;
  fromValue: string;
  toValue: string;
  required?: boolean;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  inputClassName?: string;
};

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Label className="text-sm font-medium text-foreground">
      {label}
      {required ? <span className="text-foreground"> *</span> : null}
    </Label>
  );
}

export function EducationDateRangeFields({
  label,
  fromValue,
  toValue,
  required = false,
  onFromChange,
  onToChange,
  inputClassName,
}: EducationDateRangeFieldsProps) {
  const today = todayIsoDate();

  return (
    <div className="space-y-1">
      <FieldLabel label={label} required={required} />
      <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <Input
          type="date"
          value={fromValue}
          max={toValue || today}
          className={cn(inputClassName, "w-full min-w-0")}
          onChange={(e) => onFromChange(e.target.value)}
        />
        <span className="hidden text-center text-xs font-medium text-muted-foreground sm:block">
          to
        </span>
        <Input
          type="date"
          value={toValue}
          min={fromValue || undefined}
          max={today}
          className={cn(inputClassName, "w-full min-w-0")}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">Select from date and to date using the calendar.</p>
    </div>
  );
}
