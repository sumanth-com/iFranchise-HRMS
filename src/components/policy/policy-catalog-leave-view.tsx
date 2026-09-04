"use client";

import { useState } from "react";

import {
  LeavePolicyHolidayTables,
  LeavePolicySections,
} from "@/components/leave/leave-policy-content";
import { PolicyVariantSwitcher } from "@/components/policy/policy-variant-switcher";
import { showsOptionalHolidayTable } from "@/lib/leave/leave-attendance-absence-policy-content";
import type { PolicyEmployeeCategory } from "@/lib/leave/leave-attendance-absence-policy-content";
import type { LeavePolicyDocument, LeavePolicyHolidayRow } from "@/types/leave-policy";

export function PolicyCatalogLeaveView({
  employeeName,
  fullTimeDocument,
  internProbationDocument,
  defaultCategory = "full_time",
  mandatoryHolidays,
  optionalHolidays,
  holidayYear,
}: {
  employeeName: string;
  fullTimeDocument: LeavePolicyDocument;
  internProbationDocument: LeavePolicyDocument;
  defaultCategory?: PolicyEmployeeCategory;
  mandatoryHolidays: LeavePolicyHolidayRow[];
  optionalHolidays: LeavePolicyHolidayRow[];
  holidayYear: number;
}) {
  const [category, setCategory] = useState<PolicyEmployeeCategory>(defaultCategory);
  const document =
    category === "full_time"
      ? fullTimeDocument
      : (internProbationDocument ?? fullTimeDocument);
  const showOptional = showsOptionalHolidayTable(category);

  return (
    <>
      <PolicyVariantSwitcher
        value={category}
        onChange={setCategory}
        defaultCategory={defaultCategory}
      />

      <LeavePolicySections
        intro={document.intro}
        sections={document.sections}
        employeeName={employeeName}
      />

      <LeavePolicyHolidayTables
        mandatoryHolidays={mandatoryHolidays}
        optionalHolidays={optionalHolidays}
        holidayYear={holidayYear}
        showOptionalHolidays={showOptional}
      />
    </>
  );
}
