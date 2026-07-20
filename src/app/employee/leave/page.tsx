import { MyLeaveSelfServiceView } from "@/components/leave/my-leave-self-service-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  listLeaveRequests,
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
    getEmployeeLeaveBalanceSnapshot(supabase, employeeId),
    listLeaveRequests(supabase, profile, { employeeId, page: 1, pageSize: 25 }),
    getEmployeeLeaveCalendarData(supabase, profile, calendarMonth, calendarYear),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <MyLeaveSelfServiceView
        applyHref={`${EMPLOYEE_ROUTES.leave}/new`}
        canApply={hasPermission(profile.permissionCodes, "leave.create")}
        balances={balances}
        requests={requests.data}
        calendarMonth={calendarMonth}
        calendarYear={calendarYear}
        calendarLeaves={calendar.leaves}
        calendarHolidays={calendar.holidays}
      />
    </div>
  );
}
