import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { MyLeaveSelfServiceView } from "@/components/leave/my-leave-self-service-view";
import { safeServerCall } from "@/lib/errors/safe-server";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  getLeaveLookups,
  listEmployeeOwnLeaveRequests,
} from "@/lib/leave/services/leave-queries";
import { DEFAULT_LEAVE_CALENDAR } from "@/lib/leave/services/leave-calendar-engine";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

export default async function SuperAdminLeavePage() {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
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
      "[system-admin/leave] balances",
    ),
    safeServerCall(
      () => listEmployeeOwnLeaveRequests(supabase, employeeId, 1, 25),
      [],
      "[system-admin/leave] requests",
    ),
    safeServerCall(
      () => getEmployeeLeaveCalendarData(supabase, profile, calendarMonth, calendarYear),
      { leaves: [], holidays: [], calendar: DEFAULT_LEAVE_CALENDAR },
      "[system-admin/leave] calendar",
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
          "[system-admin/leave] apply lookups",
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
          calendarContext={calendar.calendar}
        />
      </div>
    </Suspense>
  );
}
