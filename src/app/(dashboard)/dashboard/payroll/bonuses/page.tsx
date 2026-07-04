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
    month: rawParams.month ?? now.getMonth() + 1,
    year: rawParams.year ?? now.getFullYear(),
    bonusStatus: rawParams.bonusStatus,
    bonusType: rawParams.bonusType,
  });

  const [result, lookups] = await Promise.all([
    listBonuses(supabase, profile, params),
    getPayrollLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bonuses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage festival, performance, referral, and special bonuses.
        </p>
      </div>
      {canCreateBonus(profile.permissionCodes) ? (
        <BonusForm employees={lookups.employees} />
      ) : null}
      <BonusTable
        records={result.data}
        canApprove={canApproveBonus(profile.permissionCodes)}
      />
    </>
  );
}
