import { BonusForm, BonusTable } from "@/components/payroll/bonus-management";
import { createClient } from "@/lib/supabase/server";
import {
  canApproveBonus,
  canCreateBonus,
} from "@/lib/payroll/constants";
import {
  getPayrollLookups,
  listBonuses,
} from "@/lib/payroll/services/payroll-queries";
import { bonusListParamsSchema } from "@/lib/validations/payroll";
import { requireServerAnyPermission } from "@/lib/permissions/server";

type BonusesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BonusesPage({ searchParams }: BonusesPageProps) {
  const profile = await requireServerAnyPermission(["bonus.view", "payroll.view"]);
  const supabase = await createClient();
  const rawParams = await searchParams;
  const now = new Date();

  const params = bonusListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
    month: rawParams.month ? Number(rawParams.month) : undefined,
    year: rawParams.year ? Number(rawParams.year) : now.getFullYear(),
    bonusStatus: rawParams.bonusStatus,
    bonusType: rawParams.bonusType,
    employeeId: rawParams.employeeId,
    departmentId: rawParams.departmentId,
  });

  const [result, lookups] = await Promise.all([
    listBonuses(supabase, profile, params),
    getPayrollLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bonuses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage festival, performance, retention, joining, annual, and special bonuses with approval workflow.
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
