"use client";

import { useMemo } from "react";

import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  toEmployeeSelectItems,
  toLookupSelectItems,
  withSelectOption,
} from "@/components/payroll/select-utils";
import type { LookupOption } from "@/types/employee";

type OptionalEntitySelectProps = {
  options: LookupOption[];
  value: string | null | undefined;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  noneLabel?: string;
  useEmployeeLabels?: boolean;
  disabled?: boolean;
};

/** Lookup select with a "None" option; displays labels instead of raw IDs. */
export function OptionalEntitySelect({
  options,
  value,
  onValueChange,
  placeholder = "None",
  noneLabel = "None",
  useEmployeeLabels = false,
  disabled,
}: OptionalEntitySelectProps) {
  const items = useMemo(
    () =>
      withSelectOption(
        useEmployeeLabels ? toEmployeeSelectItems(options) : toLookupSelectItems(options),
        { value: "none", label: noneLabel },
      ),
    [options, useEmployeeLabels, noneLabel],
  );

  return (
    <LabeledSelect
      items={items}
      value={value ?? "none"}
      onValueChange={(next) => onValueChange(next === "none" ? null : next)}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
