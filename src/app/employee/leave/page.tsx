import { MyLeaveSelfServiceView } from "@/components/leave/my-leave-self-service-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { safeServerCall } from "@/lib/errors/safe-server";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  listEmployeeOwnLeaveRequests,
} from "@/lib/leave/services/leave-queries";
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

  const now = new Date();
  const calendarMonth = now.getMonth() + 1;
  const calendarYear = now.getFullYear();

  const [balances, requests, calendar] = await Promise.all([
    safeServerCall(
      () => getEmployeeLeaveBalanceSnapshot(supabase, employeeId),
      [],
      "[employee/leave] balances",
    ),
    safeServerCall(
      () => listEmployeeOwnLeaveRequests(supabase, employeeId, 1, 25),
      [],
      "[employee/leave] requests",
    ),
    safeServerCall(
      () => getEmployeeLeaveCalendarData(supabase, profile, calendarMonth, calendarYear),
      { leaves: [], holidays: [] },
      "[employee/leave] calendar",
    ),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <MyLeaveSelfServiceView
        applyHref={`${EMPLOYEE_ROUTES.leave}/new`}
        policyHref={EMPLOYEE_ROUTES.leavePolicy}
        canApply={hasPermission(profile.permissionCodes, "leave.create")}
        balances={balances}
        requests={requests}
        calendarMonth={calendarMonth}
        calendarYear={calendarYear}
        calendarLeaves={calendar.leaves}
        calendarHolidays={calendar.holidays}
      />
    </div>
  );
}
