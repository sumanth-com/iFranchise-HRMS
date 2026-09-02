import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  LeavePolicyPageHeader,
  LeavePolicySections,
} from "@/components/leave/leave-policy-content";
import type { PayrollPolicyDocument } from "@/types/payroll-policy";

export function PayrollPolicyView({
  backHref,
  backLabel = "Back to Payroll",
  employeeName,
  document,
}: {
  backHref: string;
  backLabel?: string;
  employeeName: string;
  document: PayrollPolicyDocument;
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
        title="Payroll Policy"
        description="Salary processing, payslips, tax deductions, and annual tax documentation."
      />

      <LeavePolicySections
        intro={document.intro}
        sections={document.sections}
        employeeName={employeeName}
      />
    </div>
  );
}
