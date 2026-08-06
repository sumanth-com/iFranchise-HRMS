import { BonusForm, BonusTable } from "@/components/payroll/bonus-management";
import { HrTeamPayrollView } from "@/components/payroll/hr-team-payroll-view";
import { PayrollRunForm } from "@/components/payroll/payroll-run-form";
import { PayrollRunsTable } from "@/components/payroll/payroll-runs-table";
import { PayrollSettingsForm } from "@/components/payroll/payroll-settings-form";
import { PayslipHistoryView } from "@/components/payroll/payslip-history-view";
import {
  ReimbursementForm,
  ReimbursementTable,
} from "@/components/payroll/reimbursement-management";
import {
  SalaryRevisionForm,
  SalaryRevisionTable,
} from "@/components/payroll/salary-revision-management";
import { SalaryStructureTable } from "@/components/payroll/salary-structure-table";
import { fetchPayrollSettingsAction } from "@/lib/payroll/actions";
import {
  canApproveBonus,
  canApproveReimbursement,
  canCreateBonus,
  canCreateReimbursement,
  canEditSalary,
  canRunPayroll,
  SELF_PAYROLL_ROUTES,
  payrollTeamSectionPath,
  TEAM_PAYROLL_SECTIONS,
  type TeamPayrollSection,
} from "@/lib/payroll/constants";
import type { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import {
  getPayrollLookups,
  getPayrollSummary,
  listBonuses,
  listPayrollRuns,
  listReimbursements,
  listSalaryRevisions,
  listSalaryStructures,
} from "@/lib/payroll/services/payroll-queries";
import { listPayslipHistory } from "@/lib/payroll/services/payslip-history-queries";
import type { createClient } from "@/lib/supabase/server";
import {
  bonusListParamsSchema,
  payrollListParamsSchema,
  payslipHistoryParamsSchema,
  reimbursementListParamsSchema,
  salaryRevisionListParamsSchema,
  salaryStructureListParamsSchema,
} from "@/lib/validations/payroll";

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

type TeamPayrollSectionProps = {
  section: TeamPayrollSection;
  rawSearchParams: Record<string, string | string[] | undefined>;
  profile: Awaited<ReturnType<typeof requireServerAnyPermission>>;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

export async function TeamPayrollSection({
  section,
  rawSearchParams,
  profile,
  supabase,
}: TeamPayrollSectionProps) {
  const now = new Date();

  if (section === TEAM_PAYROLL_SECTIONS.dashboard) {
    const teamParams = payrollListParamsSchema.parse({
      page: 1,
      pageSize: 5,
      month: firstString(rawSearchParams.month) ?? now.getMonth() + 1,
      year: firstString(rawSearchParams.year) ?? now.getFullYear(),
    });

    const [summary, recentRuns] = await Promise.all([
      getPayrollSummary(supabase, profile, teamParams.month, teamParams.year),
      listPayrollRuns(supabase, profile, teamParams),
    ]);

    return (
      <HrTeamPayrollView
        embedded
        summary={summary}
        records={recentRuns.data}
        total={recentRuns.total}
        page={recentRuns.page}
        pageSize={recentRuns.pageSize}
        month={teamParams.month ?? now.getMonth() + 1}
        year={teamParams.year ?? now.getFullYear()}
      />
    );
  }

  if (section === TEAM_PAYROLL_SECTIONS.run) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Run Payroll</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate monthly payroll from salary structures, attendance, leave, bonuses, and
            reimbursements.
          </p>
        </div>
        <PayrollRunForm
          defaultMonth={now.getMonth() + 1}
          defaultYear={now.getFullYear()}
          canRun={canRunPayroll(profile.permissionCodes)}
        />
      </div>
    );
  }

  if (section === TEAM_PAYROLL_SECTIONS["salary-structures"]) {
    const params = salaryStructureListParamsSchema.parse({
      page: rawSearchParams.page,
      pageSize: rawSearchParams.pageSize,
      search: firstString(rawSearchParams.search),
      employeeId: firstString(rawSearchParams.employeeId),
    });
    const result = await listSalaryStructures(supabase, profile, params);

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Salary Structure</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage employee compensation components and statutory deductions.
          </p>
        </div>
        <SalaryStructureTable records={result.data} />
      </div>
    );
  }

  if (section === TEAM_PAYROLL_SECTIONS.history) {
    const params = payrollListParamsSchema.parse({
      page: rawSearchParams.page,
      pageSize: rawSearchParams.pageSize,
      search: firstString(rawSearchParams.search),
      month: rawSearchParams.month,
      year: rawSearchParams.year ?? now.getFullYear(),
      payrollStatus: firstString(rawSearchParams.payrollStatus),
      employeeId: firstString(rawSearchParams.employeeId),
    });
    const result = await listPayrollRuns(supabase, profile, params);

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Payroll History</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search, filter, and review past payroll runs and payslips.
          </p>
        </div>
        <PayrollRunsTable
          records={result.data}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          search={params.search}
          month={params.month}
          year={params.year}
          payrollStatus={params.payrollStatus}
        />
      </div>
    );
  }

  if (section === TEAM_PAYROLL_SECTIONS.revisions) {
    const params = salaryRevisionListParamsSchema.parse({
      page: rawSearchParams.page,
      pageSize: rawSearchParams.pageSize,
      revisionStatus: firstString(rawSearchParams.revisionStatus),
      employeeId: firstString(rawSearchParams.employeeId),
    });
    const [result, lookups] = await Promise.all([
      listSalaryRevisions(supabase, profile, params),
      getPayrollLookups(supabase, profile.employee.organizationId),
    ]);

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Salary Revisions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Maintain salary history with effective dates, reasons, and approvals.
          </p>
        </div>
        {canEditSalary(profile.permissionCodes) ? (
          <SalaryRevisionForm employees={lookups.employees} />
        ) : null}
        <SalaryRevisionTable records={result.data} />
      </div>
    );
  }

  if (section === TEAM_PAYROLL_SECTIONS.bonuses) {
    const params = bonusListParamsSchema.parse({
      page: rawSearchParams.page,
      pageSize: rawSearchParams.pageSize,
      search: firstString(rawSearchParams.search),
      month: rawSearchParams.month ? Number(rawSearchParams.month) : undefined,
      year: rawSearchParams.year ? Number(rawSearchParams.year) : now.getFullYear(),
      bonusStatus: firstString(rawSearchParams.bonusStatus),
      bonusType: firstString(rawSearchParams.bonusType),
      employeeId: firstString(rawSearchParams.employeeId),
      departmentId: firstString(rawSearchParams.departmentId),
    });
    const [result, lookups] = await Promise.all([
      listBonuses(supabase, profile, params),
      getPayrollLookups(supabase, profile.employee.organizationId),
    ]);

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Bonuses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage festival, performance, retention, joining, annual, and special bonuses with
            approval workflow.
          </p>
        </div>
        {canCreateBonus(profile.permissionCodes) ? (
          <BonusForm employees={lookups.employees} />
        ) : null}
        <BonusTable
          records={result.data}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          employees={lookups.employees}
          departments={lookups.departments}
          search={params.search}
          month={params.month}
          year={params.year}
          bonusStatus={params.bonusStatus}
          bonusType={params.bonusType}
          employeeId={params.employeeId}
          departmentId={params.departmentId}
          canApprove={canApproveBonus(profile.permissionCodes)}
        />
      </div>
    );
  }

  if (section === TEAM_PAYROLL_SECTIONS.reimbursements) {
    const params = reimbursementListParamsSchema.parse({
      page: rawSearchParams.page,
      pageSize: rawSearchParams.pageSize,
      month: rawSearchParams.month ?? now.getMonth() + 1,
      year: rawSearchParams.year ?? now.getFullYear(),
      reimbursementStatus: firstString(rawSearchParams.reimbursementStatus),
      category: firstString(rawSearchParams.category),
    });
    const [result, lookups] = await Promise.all([
      listReimbursements(supabase, profile, params),
      getPayrollLookups(supabase, profile.employee.organizationId),
    ]);

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Reimbursements</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Track travel, food, fuel, internet, laptop, and other reimbursements.
          </p>
        </div>
        {canCreateReimbursement(profile.permissionCodes) ? (
          <ReimbursementForm employees={lookups.employees} />
        ) : null}
        <ReimbursementTable
          records={result.data}
          canApprove={canApproveReimbursement(profile.permissionCodes)}
        />
      </div>
    );
  }

  if (section === TEAM_PAYROLL_SECTIONS.payslips) {
    const params = payslipHistoryParamsSchema.parse({
      page: rawSearchParams.page,
      pageSize: rawSearchParams.pageSize,
      search: firstString(rawSearchParams.search),
      month: rawSearchParams.month,
      year: rawSearchParams.year,
      yearFilter: firstString(rawSearchParams.yearFilter),
      employeeId: firstString(rawSearchParams.employeeId),
      includeArchived: rawSearchParams.includeArchived === "true",
      groupByYear: true,
    });
    const history = await listPayslipHistory(supabase, profile, params);

    return (
      <PayslipHistoryView
        history={history}
        mode="hr"
        basePath={payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.payslips)}
      />
    );
  }

  if (section === TEAM_PAYROLL_SECTIONS.settings) {
    const record = await fetchPayrollSettingsAction();
    const canEdit = hasAnyPermission(profile.permissionCodes, [
      "settings.edit",
      "settings.manage",
      "payroll.edit",
      "payroll.approve",
    ]);

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Payroll Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure payroll cycle, processing rules, and approval workflows.
          </p>
        </div>
        <PayrollSettingsForm record={record} canEdit={canEdit} />
      </div>
    );
  }

  return null;
}
