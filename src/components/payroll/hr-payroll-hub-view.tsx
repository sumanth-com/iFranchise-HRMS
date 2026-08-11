"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FileText, Download } from "lucide-react";

import { Button } from "@/components/common/button";
import { EmployeePayslipDrawer } from "@/components/employee/payroll/employee-payslip-drawer";
import { EmployeePayrollView } from "@/components/employee/payroll/employee-payroll-view";
import { PayrollSubNav } from "@/components/payroll/payroll-sub-nav";
import {
  TeamPayrollHeaderActionsOutlet,
  TeamPayrollHeaderActionsProvider,
} from "@/components/payroll/team-payroll-header-actions";
import { TeamPayrollHeaderActionsReset } from "@/components/payroll/team-payroll-header-actions-reset";
import {
  parseTeamPayrollSection,
  SELF_PAYROLL_ROUTES,
  teamPayrollSectionDescription,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";
import type { EmployeePayrollData } from "@/types/employee-payroll";

type PayrollSection = "my" | "team";

type Props = {
  initialSection?: PayrollSection;
  canViewTeam: boolean;
  selfPayroll: EmployeePayrollData;
  children?: ReactNode;
};

export function HrPayrollHubView({
  initialSection = "my",
  canViewTeam,
  selfPayroll,
  children,
}: Props) {
  const pathname = usePathname();
  const activeSection =
    initialSection === "team" && canViewTeam ? "team" : "my";
  const isTeamView = activeSection === "team";

  const teamPayrollSection =
    pathname === SELF_PAYROLL_ROUTES.team
      ? TEAM_PAYROLL_SECTIONS.run
      : parseTeamPayrollSection(pathname.slice(SELF_PAYROLL_ROUTES.team.length + 1));

  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function openLatestPayslip() {
    const latestId = selfPayroll.payslips[0]?.id;
    if (!latestId) return;
    setActivePayslipId(latestId);
    setDrawerOpen(true);
  }

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="space-y-3">
        {isTeamView ? <PayrollSubNav /> : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {isTeamView ? "Team Payroll" : "Payroll"}
          </h1>
          {isTeamView ? (
            <TeamPayrollHeaderActionsOutlet />
          ) : (
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
          )}
        </div>

        <p className="max-w-3xl text-sm text-muted-foreground">
          {isTeamView
            ? teamPayrollSectionDescription(teamPayrollSection)
            : "View payslips, download salary documents, and track your compensation history."}
        </p>
      </div>

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

  if (isTeamView) {
    return (
      <TeamPayrollHeaderActionsProvider>
        <TeamPayrollHeaderActionsReset />
        {content}
      </TeamPayrollHeaderActionsProvider>
    );
  }

  return content;
}
