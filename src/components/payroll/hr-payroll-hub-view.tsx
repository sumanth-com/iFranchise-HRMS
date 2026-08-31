"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { CircleHelp, FileText, Download } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { PayrollSubNav } from "@/components/payroll/payroll-sub-nav";
import { TeamPayrollContentSkeleton } from "@/components/payroll/team-payroll-content-skeleton";
import {
  TeamPayrollHeaderActionsOutlet,
  TeamPayrollHeaderActionsProvider,
} from "@/components/payroll/team-payroll-header-actions";
import { TeamPayrollHeaderActionsReset } from "@/components/payroll/team-payroll-header-actions-reset";
import {
  parseTeamPayrollSection,
  PAYROLL_ROUTES,
  SELF_PAYROLL_ROUTES,
  teamPayrollSectionDescription,
  teamPayrollSectionTitle,
  TEAM_PAYROLL_SECTIONS,
  type TeamPayrollSection,
} from "@/lib/payroll/constants";
import type { EmployeePayrollData } from "@/types/employee-payroll";

/** Lazy: Team Payroll must not evaluate employee payslip/server-action modules. */
const EmployeePayrollView = dynamic(
  () =>
    import("@/components/employee/payroll/employee-payroll-view").then(
      (mod) => mod.EmployeePayrollView,
    ),
  {
    ssr: false,
    loading: () => <TeamPayrollContentSkeleton />,
  },
);

const EmployeePayslipDrawer = dynamic(
  () =>
    import("@/components/employee/payroll/employee-payslip-drawer").then(
      (mod) => mod.EmployeePayslipDrawer,
    ),
  { ssr: false },
);

type PayrollSection = "my" | "team";

type Props = {
  initialSection?: PayrollSection;
  canViewTeam: boolean;
  selfPayroll: EmployeePayrollData;
  children?: ReactNode;
  teamBasePath?: string;
  hiddenSections?: TeamPayrollSection[];
};

const SECTION_HELP: Record<
  TeamPayrollSection,
  {
    title: string;
    points: { label: string; detail: string }[];
  }
> = {
  run: {
    title: "About Run Payroll",
    points: [
      {
        label: "What this page is for",
        detail:
          "Generate and process the monthly payroll for active employees — review attendance impact, finalize amounts, and move the run through draft → processed → approved → paid.",
      },
      {
        label: "Status pills",
        detail:
          "Draft (pending) = run exists but is not finished yet. Processing = calculation is running. Processed = amounts are ready for HR review. Approved = cleared for payment. Paid = salaries released. Cancelled = stopped and will not be paid.",
      },
      {
        label: "Employee filter",
        detail:
          "Use Search employee next to month and year to find someone by name or employee code in the payroll list after you run or open a period.",
      },
      {
        label: "Before you run",
        detail:
          "Confirm salary structures are Current for everyone in the cycle, and that bonuses or expense claims meant for this month are already approved.",
      },
      {
        label: "Payslips",
        detail:
          "After the run is finalized and paid, published payslips appear under the Payslips section for preview, download, and email.",
      },
    ],
  },
  "salary-structures": {
    title: "About Salary Structure",
    points: [
      {
        label: "What this page is for",
        detail:
          "Define each employee’s pay components (basic, HRA, allowances, deductions) and when that package becomes effective for payroll runs.",
      },
      {
        label: "Current",
        detail:
          "The structure that is active today — payroll uses this until a newer structure starts or this one ends.",
      },
      {
        label: "Historical",
        detail:
          "An older structure that is no longer active. Kept for reference so HR can see past pay packages and effective dates. It is not used for new payroll runs.",
      },
      {
        label: "Adding a new structure",
        detail:
          "When you add a newer structure for an employee, the previous Current one becomes Historical automatically.",
      },
      {
        label: "Filters",
        detail:
          "Use month, year, employee, and status (Current / Historical) filters to find the right structure quickly.",
      },
    ],
  },
  bonuses: {
    title: "About Bonuses",
    points: [
      {
        label: "What this page is for",
        detail:
          "Record one-time or special bonuses (festival, performance, joining, etc.) and send them through approval before they enter a payroll run.",
      },
      {
        label: "Approval flow",
        detail:
          "Bonuses typically need HR and Finance approval. Only approved bonuses for the selected month are picked up when you run payroll.",
      },
      {
        label: "Status pills",
        detail:
          "Pending = waiting on approval. Approved = ready for payroll. Paid = already settled in a completed run. Rejected or cancelled = not paid.",
      },
      {
        label: "Filters",
        detail:
          "Use month, year, employee, and status filters to find a bonus quickly before approving or reviewing.",
      },
    ],
  },
  reimbursements: {
    title: "About Expense claims",
    points: [
      {
        label: "What this page is for",
        detail:
          "Review employee expense claims (travel, food, fuel, internet, and other categories) and approve amounts to settle through payroll.",
      },
      {
        label: "Approval",
        detail:
          "Approve only valid claims with clear descriptions. Approved claims can be included in the next payroll cycle for payout.",
      },
      {
        label: "Status pills",
        detail:
          "Pending = waiting on approval. Approved = ready to pay in payroll. Paid = settled. Rejected or cancelled = not paid.",
      },
      {
        label: "Filters",
        detail:
          "Use month, year, employee, and status filters to locate claims before you approve them.",
      },
    ],
  },
  payslips: {
    title: "About Payslips",
    points: [
      {
        label: "What this page is for",
        detail:
          "Find published payslips after payroll is processed — preview details, download PDFs, and email copies to employees.",
      },
      {
        label: "When payslips appear",
        detail:
          "Payslips are created from completed payroll runs. Draft or in-progress runs will not show final payslips here yet.",
      },
      {
        label: "Filters",
        detail:
          "Use month, year, or employee filters to locate a specific slip quickly across the organization.",
      },
    ],
  },
  settings: {
    title: "About Payroll Settings",
    points: [
      {
        label: "What this page is for",
        detail:
          "Configure the organization payroll cycle, processing schedule, salary credit day, and when employees can open payslips.",
      },
      {
        label: "Salary credit day",
        detail:
          "Controls when salaries are expected to credit. Keep this aligned with Finance so employees see the correct credit date on payslips.",
      },
      {
        label: "Payslip available day",
        detail:
          "Employees in every portal can open their payslip from the 5th of the month after that payroll period, once attendance and leave are finalized.",
      },
      {
        label: "Who should change this",
        detail:
          "Only update settings when Finance and HR agree — changes can affect how future payroll runs and payslip dates are presented.",
      },
    ],
  },
};

export function HrPayrollHubView({
  initialSection = "my",
  canViewTeam,
  selfPayroll,
  children,
  teamBasePath = SELF_PAYROLL_ROUTES.team,
  hiddenSections = [],
}: Props) {
  const pathname = usePathname();
  const activeSection =
    initialSection === "team" && canViewTeam ? "team" : "my";
  const isTeamView = activeSection === "team";

  const teamPayrollSection =
    pathname === teamBasePath
      ? TEAM_PAYROLL_SECTIONS.run
      : parseTeamPayrollSection(
          pathname.slice(teamBasePath.length + 1).split("/")[0],
        );

  const [activePayslipId, setActivePayslipId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const sectionHelp = isTeamView ? SECTION_HELP[teamPayrollSection] : undefined;

  function openLatestPayslip() {
    const latestId = selfPayroll.payslips.find((row) => row.canEmployeeAccess)?.id;
    if (!latestId) return;
    setActivePayslipId(latestId);
    setDrawerOpen(true);
  }

  const content = (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <div className="space-y-3">
        {isTeamView ? (
          <PayrollSubNav basePath={teamBasePath} hiddenSections={hiddenSections} />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isTeamView ? teamPayrollSectionTitle(teamPayrollSection) : "Payroll"}
            </h1>
            {sectionHelp ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-8 text-muted-foreground hover:text-foreground"
                aria-label={`About ${teamPayrollSectionTitle(teamPayrollSection)}`}
                onClick={() => setHelpOpen(true)}
              >
                <CircleHelp className="size-4" />
              </Button>
            ) : null}
          </div>
          {isTeamView ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                nativeButton={false}
                render={<Link href={PAYROLL_ROUTES.policy} />}
              >
                <FileText className="size-4" />
                Payroll Policy
              </Button>
              <TeamPayrollHeaderActionsOutlet />
            </div>
          ) : (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={!selfPayroll.payslips.some((row) => row.canEmployeeAccess)}
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

      {sectionHelp ? (
        <Modal
          open={helpOpen}
          onOpenChange={setHelpOpen}
          title={sectionHelp.title}
          description="Quick reference for HR using this section."
          contentClassName="sm:max-w-lg"
          showCancel={false}
          footer={
            <Button type="button" onClick={() => setHelpOpen(false)}>
              Got it
            </Button>
          }
        >
          <div className="space-y-4">
            {sectionHelp.points.map((point) => (
              <div key={point.label} className="space-y-1">
                <p className="text-sm font-medium">{point.label}</p>
                <p className="text-sm text-muted-foreground">{point.detail}</p>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
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
