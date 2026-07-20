import { MyLeaveSelfServiceView } from "@/components/leave/my-leave-self-service-view";
import { SELF_LEAVE_ROUTES } from "@/lib/leave/constants";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  listLeaveRequests,
} from "@/lib/leave/services/leave-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

export default async function LeaveSelfServicePage() {
  const profile = await requireServerPermission("leave.view");
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
    <MyLeaveSelfServiceView
      title="My Leave"
      description="Apply for leave, check your balances, and track your own requests."
      applyHref={SELF_LEAVE_ROUTES.new}
      canApply={hasPermission(profile.permissionCodes, "leave.create")}
      balances={balances}
      requests={requests.data}
      calendarMonth={calendarMonth}
      calendarYear={calendarYear}
      calendarLeaves={calendar.leaves}
      calendarHolidays={calendar.holidays}
    />
  );
}
