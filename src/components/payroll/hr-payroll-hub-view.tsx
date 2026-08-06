"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/common/button";
import { EmployeePayrollView } from "@/components/employee/payroll/employee-payroll-view";
import { HrTeamPayrollView } from "@/components/payroll/hr-team-payroll-view";
import { PayrollSubNav } from "@/components/payroll/payroll-sub-nav";
import { SELF_DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { SELF_PAYROLL_ROUTES } from "@/lib/payroll/constants";
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab");
  const activeSection: PayrollSection =
    canViewTeam && (tab === "team" || (tab === null && initialSection === "team"))
      ? "team"
      : "my";

  function setSection(next: PayrollSection) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    if (next === "team") {
      const now = new Date();
      if (!params.get("year")) params.set("year", String(now.getFullYear()));
      if (!params.get("month")) params.set("month", String(now.getMonth() + 1));
    }
    router.push(`${SELF_PAYROLL_ROUTES.list}?${params.toString()}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Payroll</h1>
        {canViewTeam ? (
          <div className="flex items-center gap-2 rounded-lg border bg-card p-1">
            <Button
              size="sm"
              variant={activeSection === "my" ? "default" : "ghost"}
              onClick={() => setSection("my")}
            >
              My Payroll
            </Button>
            <Button
              size="sm"
              variant={activeSection === "team" ? "default" : "ghost"}
              onClick={() => setSection("team")}
            >
              Team Payroll
            </Button>
          </div>
        ) : null}
      </div>

      {activeSection === "team" && canViewTeam ? <PayrollSubNav /> : null}

      {activeSection === "my" || !canViewTeam ? (
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
