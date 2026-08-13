import { redirect } from "next/navigation";
import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { MyLeaveSelfServiceView } from "@/components/leave/my-leave-self-service-view";
import { safeServerCall } from "@/lib/errors/safe-server";
import { hubListUrl } from "@/lib/dashboard/hub-paths";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  getLeaveLookups,
  listEmployeeOwnLeaveRequests,
} from "@/lib/leave/services/leave-queries";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

type ManagerLeavePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function teamRedirect(
  raw: Record<string, string | string[] | undefined>,
): string | null {
  const tab = firstString(raw.tab);
  const leaveId = firstString(raw.leaveId);
  if (tab !== "team" && !leaveId) return null;

  const filters: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === "tab" || typeof value !== "string" || !value) continue;
    filters[key] = value;
  }
  return hubListUrl(MANAGER_ROUTES.leaveTeam, filters);
}

export default async function ManagerLeavePage({
  searchParams,
}: ManagerLeavePageProps) {
  const profile = await requireServerAnyPermission([
    "portal.manager.access",
    "leave.view",
  ]);
  const supabase = await createClient();
  const rawParams = await searchParams;
  const legacy = teamRedirect(rawParams);
  if (legacy) redirect(legacy);

  const employeeId = profile.employee.id;
  const now = new Date();
  const calendarMonth = now.getMonth() + 1;
  const calendarYear = now.getFullYear();
  const canApply = hasPermission(profile.permissionCodes, "leave.create");
  const canEdit =
    hasPermission(profile.permissionCodes, "leave.edit") ||
    hasPermission(profile.permissionCodes, "leave.create");
  const canDelete =
    hasPermission(profile.permissionCodes, "leave.delete") ||
    hasPermission(profile.permissionCodes, "leave.cancel") ||
    hasPermission(profile.permissionCodes, "leave.withdraw");

  const [balances, requests, calendar, applyLookups] = await Promise.all([
    safeServerCall(
      () => getEmployeeLeaveBalanceSnapshot(supabase, employeeId),
      [],
      "[manager/leave] balances",
    ),
    safeServerCall(
      () => listEmployeeOwnLeaveRequests(supabase, employeeId, 1, 25),
      [],
      "[manager/leave] requests",
    ),
    safeServerCall(
      () => getEmployeeLeaveCalendarData(supabase, profile, calendarMonth, calendarYear),
      { leaves: [], holidays: [] },
      "[manager/leave] calendar",
    ),
    canApply
      ? safeServerCall(
          () => getLeaveLookups(supabase, profile.employee.organizationId),
          {
            leaveTypes: [],
            departments: [],
            branches: [],
            employees: [],
            managers: [],
            approvers: [],
            employmentTypes: [],
          },
          "[manager/leave] apply lookups",
        )
      : Promise.resolve(null),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
        <MyLeaveSelfServiceView
          canApply={canApply}
          canEdit={canEdit}
          canDelete={canDelete}
          employeeId={employeeId}
          applyLeaveLookups={applyLookups}
          balances={balances}
          requests={requests}
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          calendarLeaves={calendar.leaves}
          calendarHolidays={calendar.holidays}
        />
      </div>
    </Suspense>
  );
}
