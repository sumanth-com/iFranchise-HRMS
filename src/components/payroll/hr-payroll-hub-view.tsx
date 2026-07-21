"use client";

import { useState } from "react";

import { Button } from "@/components/common/button";
import { EmployeePayrollView } from "@/components/employee/payroll/employee-payroll-view";
import { HrTeamPayrollView } from "@/components/payroll/hr-team-payroll-view";
import { SELF_DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import type { EmployeePayrollData } from "@/types/employee-payroll";
import type { PayrollListItem, PayrollSummary } from "@/types/payroll";

type PayrollSection = "my" | "team";

type TeamPayrollData = {
  summary: PayrollSummary;
  records: PayrollListItem[];
  total: number;
  page: number;
  pageSize: number;
  month: number;
  year: number;
};

type Props = {
  initialSection?: PayrollSection;
  canViewTeam: boolean;
  selfPayroll: EmployeePayrollData;
  teamPayroll: TeamPayrollData;
};

export function HrPayrollHubView({
  initialSection = "my",
  canViewTeam,
  selfPayroll,
  teamPayroll,
}: Props) {
  const sectionDefault =
    initialSection === "team" && canViewTeam ? "team" : "my";
  const [section, setSection] = useState<PayrollSection>(sectionDefault);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
          <p className="text-sm text-muted-foreground">
            View your payslips and compensation, or manage organization-wide payroll.
          </p>
        </div>
        {canViewTeam ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
            <Button
              size="sm"
              variant={section === "my" ? "default" : "ghost"}
              onClick={() => setSection("my")}
            >
              My Payroll
            </Button>
            <Button
              size="sm"
              variant={section === "team" ? "default" : "ghost"}
              onClick={() => setSection("team")}
            >
              Team Payroll
            </Button>
          </div>
        ) : null}
      </div>

      {section === "my" || !canViewTeam ? (
        <EmployeePayrollView
          data={selfPayroll}
          documentsHref={SELF_DOCUMENTS_ROUTES.list}
          showPageHeading={false}
        />
      ) : (
        <HrTeamPayrollView {...teamPayroll} embedded />
      )}
    </div>
  );
}
