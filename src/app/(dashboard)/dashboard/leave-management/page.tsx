import { Suspense } from "react";

import { LeaveSummaryCards } from "@/components/leave/leave-summary-cards";
import { LeaveTable } from "@/components/leave/leave-table";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { createClient } from "@/lib/supabase/server";
import {
  getLeaveLookups,
  getLeaveSummary,
  listLeaveRequests,
} from "@/lib/leave/services/leave-queries";
import { leaveListParamsSchema } from "@/lib/validations/leave";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";

type LeavePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeavePage({ searchParams }: LeavePageProps) {
  const profile = await requireServerPermission("leave.view");
  const supabase = await createClient();
  const rawParams = await searchParams;
  const now = new Date();

  const params = leaveListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
    sortBy: rawParams.sortBy,
    sortOrder: rawParams.sortOrder,
    month: rawParams.month ?? now.getMonth() + 1,
    year: rawParams.year ?? now.getFullYear(),
    leaveStatus: rawParams.leaveStatus,
    leaveTypeId: rawParams.leaveTypeId,
    departmentId: rawParams.departmentId,
    branchId: rawParams.branchId,
    approverId: rawParams.approverId,
    reportingManagerId: rawParams.reportingManagerId,
    employeeId: rawParams.employeeId,
  });

  const [result, lookups, summary] = await Promise.all([
    listLeaveRequests(supabase, profile, params),
    getLeaveLookups(supabase, profile.employee.organizationId),
    getLeaveSummary(supabase, profile, params.month, params.year),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leave Management</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track leave requests, approvals, balances, and workforce availability across the organization.
        </p>
      </div>

      <LeaveSummaryCards summary={summary} />

      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <LeaveTable
          records={result.data}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          search={params.search ?? ""}
          month={params.month ?? now.getMonth() + 1}
          year={params.year ?? now.getFullYear()}
          leaveStatus={params.leaveStatus}
          leaveTypeId={params.leaveTypeId}
          departmentId={params.departmentId}
          branchId={params.branchId}
          approverId={params.approverId}
          reportingManagerId={params.reportingManagerId}
          employeeId={params.employeeId}
          leaveTypes={lookups.leaveTypes}
          departments={lookups.departments}
          branches={lookups.branches}
          employees={lookups.employees}
          approvers={lookups.approvers}
          managers={lookups.managers}
          canCreate={hasPermission(profile.permissionCodes, "leave.create")}
          canApprove={hasPermission(profile.permissionCodes, "leave.approve")}
          canReject={hasPermission(profile.permissionCodes, "leave.reject")}
          canCancel={
            hasPermission(profile.permissionCodes, "leave.cancel") ||
            hasPermission(profile.permissionCodes, "leave.withdraw")
          }
        />
      </Suspense>
    </div>
  );
}
