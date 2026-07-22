import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  LeavePolicyContactBar,
  LeavePolicyPageHeader,
  LeavePolicySections,
} from "@/components/leave/leave-policy-content";
import type { AttendancePolicyDocument } from "@/types/attendance-policy";

export function AttendancePolicyView({
  backHref,
  backLabel = "Back to My Attendance",
  employeeName,
  document,
}: {
  backHref: string;
  backLabel?: string;
  employeeName: string;
  document: AttendancePolicyDocument;
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
        description="Working hours, daily meeting attendance, payroll rules, and sandwich leave guidelines."
      />

      <LeavePolicySections
        intro={document.intro}
        sections={document.sections}
        employeeName={employeeName}
      />

      <LeavePolicyContactBar contact={document.contact} />
    </div>
  );
}
