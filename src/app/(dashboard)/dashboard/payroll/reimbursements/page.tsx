import {
  ReimbursementForm,
  ReimbursementTable,
} from "@/components/payroll/reimbursement-management";
import { createClient } from "@/lib/supabase/server";
import {
  canApproveReimbursement,
  canCreateReimbursement,
} from "@/lib/payroll/constants";
import {
  getPayrollLookups,
  listReimbursements,
} from "@/lib/payroll/services/payroll-queries";
import { reimbursementListParamsSchema } from "@/lib/validations/payroll";
import { requireServerAnyPermission } from "@/lib/permissions/server";

type ReimbursementsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReimbursementsPage({
  searchParams,
}: ReimbursementsPageProps) {
  const profile = await requireServerAnyPermission([
    "reimbursement.view",
    "payroll.view",
  ]);
  const supabase = await createClient();
  const rawParams = await searchParams;
  const now = new Date();

  const params = reimbursementListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    month: rawParams.month ?? now.getMonth() + 1,
    year: rawParams.year ?? now.getFullYear(),
    reimbursementStatus: rawParams.reimbursementStatus,
    category: rawParams.category,
  });

  const [result, lookups] = await Promise.all([
    listReimbursements(supabase, profile, params),
    getPayrollLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reimbursements</h1>
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
    </>
  );
}
