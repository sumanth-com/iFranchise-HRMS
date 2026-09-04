"use client";

import { useState } from "react";

import { LeavePolicySections } from "@/components/leave/leave-policy-content";
import { PolicyVariantSwitcher } from "@/components/policy/policy-variant-switcher";
import type { PolicyEmployeeCategory } from "@/lib/leave/leave-attendance-absence-policy-content";
import type { AttendancePolicyDocument } from "@/types/attendance-policy";

export function PolicyCatalogAttendanceView({
  employeeName,
  fullTimeDocument,
  internProbationDocument,
  defaultCategory = "full_time",
}: {
  employeeName: string;
  fullTimeDocument: AttendancePolicyDocument;
  internProbationDocument: AttendancePolicyDocument;
  defaultCategory?: PolicyEmployeeCategory;
}) {
  const [category, setCategory] = useState<PolicyEmployeeCategory>(defaultCategory);
  const document =
    category === "full_time"
      ? fullTimeDocument
      : (internProbationDocument ?? fullTimeDocument);

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
    </>
  );
}
