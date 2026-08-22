import { BonusTable } from "@/components/payroll/bonus-management";
import { PayrollRunForm } from "@/components/payroll/payroll-run-form";
import { PayrollSettingsForm } from "@/components/payroll/payroll-settings-form";
import { PayslipHistoryView } from "@/components/payroll/payslip-history-view";
import { ReimbursementTable } from "@/components/payroll/reimbursement-management";
import { SalaryStructureTable } from "@/components/payroll/salary-structure-table";
import { fetchPayrollSettingsAction } from "@/lib/payroll/actions";
import {
  canApproveBonus,
  canApproveReimbursement,
  canCreateBonus,
  canCreateReimbursement,
  canEditSalary,
  canRunPayroll,
  payrollTeamSectionPath,
  TEAM_PAYROLL_SECTIONS,
  type TeamPayrollSection,
} from "@/lib/payroll/constants";
import type { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasAnyPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";
import {
  getPayrollLookups,
  listBonuses,
  listReimbursements,
  listSalaryStructures,
} from "@/lib/payroll/services/payroll-queries";
import { listPayslipHistory } from "@/lib/payroll/services/payslip-history-queries";
import {
  bonusListParamsSchema,
  payslipHistoryParamsSchema,
  reimbursementListParamsSchema,
  salaryStructureListParamsSchema,
} from "@/lib/validations/payroll";

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

type TeamPayrollSectionProps = {
  section: TeamPayrollSection;
  rawSearchParams: Record<string, string | string[] | undefined>;
  profile: Awaited<ReturnType<typeof requireServerAnyPermission>>;
  teamBasePath?: string;
  canRunPayrollOverride?: boolean;
};

export async function TeamPayrollSection({
  section,
  rawSearchParams,
  profile,
  teamBasePath,
  canRunPayrollOverride,
}: TeamPayrollSectionProps) {
  const supabase = await createClient();
  const now = new Date();

  if (section === TEAM_PAYROLL_SECTIONS.run) {
    const requestedMonth = Number(firstString(rawSearchParams.month));
    const requestedYear = Number(firstString(rawSearchParams.year));
    return (
      <PayrollRunForm
        defaultMonth={
          Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
            ? requestedMonth
            : now.getMonth() + 1
        }
        defaultYear={
          Number.isInteger(requestedYear) && requestedYear >= 2000
            ? requestedYear
            : now.getFullYear()
        }
        autoLoad={firstString(rawSearchParams.autoload) === "1"}
        canRun={canRunPayrollOverride ?? canRunPayroll(profile.permissionCodes)}
      />
    );
  }

  if (section === TEAM_PAYROLL_SECTIONS["salary-structures"]) {
    const params = salaryStructureListParamsSchema.parse({
      page: rawSearchParams.page,
      pageSize: rawSearchParams.pageSize,
      search: firstString(rawSearchParams.search),
      employeeId: firstString(rawSearchParams.employeeId),
    });
    const [result, lookups] = await Promise.all([
      listSalaryStructures(supabase, profile, params),
      getPayrollLookups(supabase, profile.employee.organizationId),
    ]);

    return (
      <SalaryStructureTable
        records={result.data}
        employees={lookups.employees}
        canEdit={canEditSalary(profile.permissionCodes)}
      />
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
        canCreate={canCreateBonus(profile.permissionCodes)}
      />
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
      <ReimbursementTable
        records={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        employees={lookups.employees}
        canApprove={canApproveReimbursement(profile.permissionCodes)}
        canCreate={canCreateReimbursement(profile.permissionCodes)}
      />
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
        embedded
        basePath={
          teamBasePath
            ? `${teamBasePath}/${TEAM_PAYROLL_SECTIONS.payslips}`
            : payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.payslips)
        }
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

    return <PayrollSettingsForm record={record} canEdit={canEdit} variant="team" />;
  }

  return null;
}
