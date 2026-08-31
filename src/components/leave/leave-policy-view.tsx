import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  LeavePolicyContactBar,
  LeavePolicyHolidayTables,
  LeavePolicyPageHeader,
  LeavePolicySections,
} from "@/components/leave/leave-policy-content";
import type { LeavePolicyDocument, LeavePolicyHolidayRow } from "@/types/leave-policy";

export function LeavePolicyView({
  backHref,
  backLabel = "Back to My Leave",
  employeeName,
  document,
  mandatoryHolidays,
  optionalHolidays,
  holidayYear,
}: {
  backHref: string;
  backLabel?: string;
  employeeName: string;
  document: LeavePolicyDocument;
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
        title="Leave Policy"
        description="Probation period policies, leave entitlement, confirmation criteria, and holiday list."
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
      />

      <LeavePolicyContactBar contact={document.contact} />
    </div>
  );
}
