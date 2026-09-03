import { BonusTable } from "@/components/payroll/bonus-management";
import { PayrollRunForm } from "@/components/payroll/payroll-run-form";
import type { CompanyPayrollInitialPanel } from "@/components/payroll/payroll-run-form";
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
  listPayrollRuns,
  listReimbursements,
  listSalaryStructures,
} from "@/lib/payroll/services/payroll-queries";
import {
  ensureCompanyPayrollRun,
  getPayrollRunById,
  previewPayrollRun,
} from "@/lib/payroll/services/payroll-mutations";
import { formatPayrollMonth } from "@/lib/payroll/services/payroll-utils";
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

function isFuturePayrollPeriod(month: number, year: number) {
  const now = new Date();
  if (year > now.getFullYear()) return true;
  if (year === now.getFullYear() && month > now.getMonth() + 1) return true;
  return false;
}

async function loadCompanyPayrollInitialPanel(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  profile: Awaited<ReturnType<typeof requireServerAnyPermission>>;
  month: number;
  year: number;
  canRun: boolean;
}): Promise<CompanyPayrollInitialPanel> {
  const { supabase, profile, month, year, canRun } = params;
  const periodLabel = formatPayrollMonth(month, year);

  if (isFuturePayrollPeriod(month, year)) {
    return {
      kind: "info",
      title: `${periodLabel} is an upcoming period`,
      text: "Payroll is calculated for the current month and completed past months.",
      tone: "warning",
    };
  }

  try {
    if (canRun) {
      const payrollId = await ensureCompanyPayrollRun(supabase, profile, { month, year });
      const detail = await getPayrollRunById(supabase, profile, payrollId);
      if (detail) return { kind: "run", data: detail, mode: "existing" };
    }

    const runs = await listPayrollRuns(supabase, profile, {
      month,
      year,
      page: 1,
      pageSize: 1,
    });
    if (runs.data[0]) {
      const detail = await getPayrollRunById(supabase, profile, runs.data[0].id);
      if (detail) return { kind: "run", data: detail, mode: "existing" };
    }

    const preview = await previewPayrollRun(supabase, profile, { month, year });
    if (preview.employeeCount === 0) {
      return {
        kind: "info",
        title: `No employees for ${periodLabel}`,
        text: "Add active employees before viewing payroll for this period.",
      };
    }
    return { kind: "preview", data: preview };
  } catch (error) {
    return {
      kind: "info",
      title: "Unable to load payroll",
      text: error instanceof Error ? error.message : "Failed to load Company Payroll.",
    };
  }
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
    const month =
      Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
        ? requestedMonth
        : now.getMonth() + 1;
    const year =
      Number.isInteger(requestedYear) && requestedYear >= 2000
        ? requestedYear
        : now.getFullYear();
    const canRun = canRunPayrollOverride ?? canRunPayroll(profile.permissionCodes);
    const initialPanel = await loadCompanyPayrollInitialPanel({
      supabase,
      profile,
      month,
      year,
      canRun,
    });
    return (
      <PayrollRunForm
        defaultMonth={month}
        defaultYear={year}
        canRun={canRun}
        initialPanel={initialPanel}
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
        employmentTypes={lookups.employmentTypes}
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
      pageSize: firstString(rawSearchParams.pageSize) ?? 100,
      search: firstString(rawSearchParams.search),
      month: firstString(rawSearchParams.month) ?? now.getMonth() + 1,
      year: firstString(rawSearchParams.year) ?? now.getFullYear(),
      employeeId: firstString(rawSearchParams.employeeId),
      includeArchived: rawSearchParams.includeArchived === "true",
      groupByYear: false,
      payslipStatus: firstString(rawSearchParams.payslipStatus) ?? "all",
    });
    const history = await listPayslipHistory(supabase, profile, params);

    return (
      <PayslipHistoryView
        history={history}
        mode="hr"
        embedded
        month={params.month ?? now.getMonth() + 1}
        year={params.year ?? now.getFullYear()}
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
