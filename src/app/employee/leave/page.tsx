import { MyLeaveSelfServiceView } from "@/components/leave/my-leave-self-service-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { safeServerCall } from "@/lib/errors/safe-server";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  getLeaveLookups,
  listEmployeeOwnLeaveRequests,
} from "@/lib/leave/services/leave-queries";
import { DEFAULT_LEAVE_CALENDAR } from "@/lib/leave/services/leave-calendar-engine";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeLeavePage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "leave.view",
  ]);
  const supabase = await createClient();
  const employeeId = profile.employee.id;
  const canApply = hasPermission(profile.permissionCodes, "leave.create");
  const canEdit =
    hasPermission(profile.permissionCodes, "leave.edit") ||
    hasPermission(profile.permissionCodes, "leave.create");
  const canDelete =
    hasPermission(profile.permissionCodes, "leave.delete") ||
    hasPermission(profile.permissionCodes, "leave.cancel") ||
    hasPermission(profile.permissionCodes, "leave.withdraw");

  const now = new Date();
  const calendarMonth = now.getMonth() + 1;
  const calendarYear = now.getFullYear();

  const [balances, requests, calendar, applyLookups] = await Promise.all([
    safeServerCall(
      () =>
        getEmployeeLeaveBalanceSnapshot(supabase, employeeId, calendarYear),
      [],
      "[employee/leave] balances",
    ),
    safeServerCall(
      () =>
        listEmployeeOwnLeaveRequests(supabase, employeeId, 1, 50, {
          month: calendarMonth,
          year: calendarYear,
        }),
      [],
      "[employee/leave] requests",
    ),
    safeServerCall(
      () => getEmployeeLeaveCalendarData(supabase, profile, calendarMonth, calendarYear),
      { leaves: [], holidays: [], calendar: DEFAULT_LEAVE_CALENDAR },
      "[employee/leave] calendar",
    ),
    canApply || canEdit
      ? safeServerCall(
          () =>
            getLeaveLookups(supabase, profile.employee.organizationId, {
              // Self-apply only — skip org-wide employee/dept/manager lookups.
              selfApplicant: {
                id: employeeId,
                label: `${profile.employee.firstName} ${profile.employee.lastName}`.trim(),
                code: profile.employee.employeeCode,
              },
            }),
          {
            leaveTypes: [],
            departments: [],
            branches: [],
            employees: [],
            managers: [],
            approvers: [],
            employmentTypes: [],
          },
          "[employee/leave] apply lookups",
        )
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <MyLeaveSelfServiceView
        policyHref={EMPLOYEE_ROUTES.leavePolicy}
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
  );
}
