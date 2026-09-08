import { EmployeeReimbursementsView } from "@/components/employee/reimbursements/employee-reimbursements-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { safeServerCall } from "@/lib/errors/safe-server";
import {
  getReimbursementSummary,
  listReimbursements,
} from "@/lib/payroll/services/payroll-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";
import type { ReimbursementListResult, ReimbursementSummary } from "@/types/payroll";

const EMPTY_LIST: ReimbursementListResult = {
  data: [],
  total: 0,
  page: 1,
  pageSize: 50,
};

const EMPTY_SUMMARY: ReimbursementSummary = {
  cards: [
    { status: "pending", count: 0, totalAmount: 0 },
    { status: "approved", count: 0, totalAmount: 0 },
    { status: "paid", count: 0, totalAmount: 0 },
    { status: "rejected", count: 0, totalAmount: 0 },
  ],
};

export default async function HrSelfReimbursementsPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.hr,
    "reimbursement.view",
    "reimbursement.create",
  ]);
  const supabase = await createClient();
  const employeeId = profile.employee.id;
  const canCreate = hasPermission(profile.permissionCodes, "reimbursement.create");

  const [listResult, summary] = await Promise.all([
    safeServerCall(
      () =>
        listReimbursements(supabase, profile, {
          employeeId,
          page: 1,
          pageSize: 50,
        }),
      EMPTY_LIST,
      "[dashboard/reimbursements] list",
    ),
    safeServerCall(
      () => getReimbursementSummary(supabase, profile, { employeeId }),
      EMPTY_SUMMARY,
      "[dashboard/reimbursements] summary",
    ),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <EmployeeReimbursementsView
        summary={summary}
        records={listResult.data}
        canCreate={canCreate}
      />
    </div>
  );
}
