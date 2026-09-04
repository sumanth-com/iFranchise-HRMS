import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/common/button";
import { LeavePolicyPageHeader } from "@/components/leave/leave-policy-content";
import { PolicyCatalogAttendanceView } from "@/components/policy/policy-catalog-attendance-view";
import type { PolicyEmployeeCategory } from "@/lib/leave/leave-attendance-absence-policy-content";
import type { AttendancePolicyDocument } from "@/types/attendance-policy";

export function AttendancePolicyView({
  backHref,
  backLabel = "Back to My Attendance",
  employeeName,
  fullTimeDocument,
  internProbationDocument,
  defaultCategory = "full_time",
}: {
  backHref: string;
  backLabel?: string;
  employeeName: string;
  fullTimeDocument: AttendancePolicyDocument;
  internProbationDocument: AttendancePolicyDocument;
  defaultCategory?: PolicyEmployeeCategory;
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
        title="Attendance Policy"
        description="Working hours, check-in/check-out expectations, late attendance, half-day rules, and related guidelines. Select the policy for your employment category."
      />

      <PolicyCatalogAttendanceView
        employeeName={employeeName}
        fullTimeDocument={fullTimeDocument}
        internProbationDocument={internProbationDocument}
        defaultCategory={defaultCategory}
      />
    </div>
  );
}
