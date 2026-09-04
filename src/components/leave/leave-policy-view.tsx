import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/common/button";
import { LeavePolicyPageHeader } from "@/components/leave/leave-policy-content";
import { PolicyCatalogLeaveView } from "@/components/policy/policy-catalog-leave-view";
import type { PolicyEmployeeCategory } from "@/lib/leave/leave-attendance-absence-policy-content";
import type { LeavePolicyDocument, LeavePolicyHolidayRow } from "@/types/leave-policy";

export function LeavePolicyView({
  backHref,
  backLabel = "Back to My Leave",
  employeeName,
  fullTimeDocument,
  internProbationDocument,
  defaultCategory = "full_time",
  mandatoryHolidays,
  optionalHolidays,
  holidayYear,
}: {
  backHref: string;
  backLabel?: string;
  employeeName: string;
  fullTimeDocument: LeavePolicyDocument;
  internProbationDocument: LeavePolicyDocument;
  defaultCategory?: PolicyEmployeeCategory;
  mandatoryHolidays: LeavePolicyHolidayRow[];
  optionalHolidays: LeavePolicyHolidayRow[];
  holidayYear: number;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex justify-start">
        <Button variant="outline" size="sm" nativeButton={false} render={<Link href={backHref} />}>
          <ArrowLeft className="size-4" />
          {backLabel}
        </Button>
      </div>

      <LeavePolicyPageHeader
        title="Leave, Attendance and Absence Policy"
        description="Leave eligibility, application rules, absence guidelines, sandwich rule, and holiday information. Select the policy for your employment category."
      />

      <PolicyCatalogLeaveView
        employeeName={employeeName}
        fullTimeDocument={fullTimeDocument}
        internProbationDocument={internProbationDocument}
        defaultCategory={defaultCategory}
        mandatoryHolidays={mandatoryHolidays}
        optionalHolidays={optionalHolidays}
        holidayYear={holidayYear}
      />
    </div>
  );
}
