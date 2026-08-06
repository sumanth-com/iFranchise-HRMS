"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FileText, Download } from "lucide-react";

import { Button } from "@/components/common/button";
import { EmployeePayslipDrawer } from "@/components/employee/payroll/employee-payslip-drawer";
import { EmployeePayrollView } from "@/components/employee/payroll/employee-payroll-view";
import { PayrollSubNav } from "@/components/payroll/payroll-sub-nav";
import {
  SELF_PAYROLL_ROUTES,
  TEAM_PAYROLL_SECTIONS,
  type TeamPayrollSection,
} from "@/lib/payroll/constants";
import type { EmployeePayrollData } from "@/types/employee-payroll";

type PayrollSection = "my" | "team";

type Props = {
  initialSection?: PayrollSection;
  initialTeamSection?: TeamPayrollSection;
  canViewTeam: boolean;
  selfPayroll: EmployeePayrollData;
  children?: ReactNode;
};

export function HrPayrollHubView({
  initialSection = "my",
  initialTeamSection = TEAM_PAYROLL_SECTIONS.dashboard,
  canViewTeam,
  selfPayroll,
  children,
}: Props) {
  const searchParams = useSearchParams();
  const activeSection =
    initialSection === "team" && canViewTeam ? "team" : "my";
  const isTeamView = activeSection === "team";

  const teamSection =
    (searchParams.get("section") as TeamPayrollSection | null) ?? initialTeamSection;

  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function openLatestPayslip() {
    const latestId = selfPayroll.payslips[0]?.id;
    if (!latestId) return;
    setActivePayslipId(latestId);
    setDrawerOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isTeamView ? "Team Payroll" : "Payroll"}
          </h1>
          {isTeamView ? (
            <p className="text-sm text-muted-foreground">
              Run payroll, review payslips, and manage compensation across the organization.
            </p>
          ) : null}
        </div>
        {!isTeamView ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={selfPayroll.payslips.length === 0}
              onClick={openLatestPayslip}
            >
              <Download className="size-4" />
              Latest Payslip
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={<Link href={SELF_PAYROLL_ROUTES.policy} />}
            >
              <FileText className="size-4" />
              Payroll Policy
            </Button>
          </div>
        ) : null}
      </div>

      {isTeamView ? <PayrollSubNav /> : null}

      {isTeamView ? (
        children
      ) : (
        <>
          <EmployeePayrollView
            data={selfPayroll}
            policyHref={SELF_PAYROLL_ROUTES.policy}
            showPageHeading={false}
            showHeaderActions={false}
          />
          <EmployeePayslipDrawer
            payslipId={activePayslipId}
            open={drawerOpen}
            onOpenChange={setDrawerOpen}
          />
        </>
      )}
    </div>
  );
}
