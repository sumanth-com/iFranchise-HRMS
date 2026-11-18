import type { MyLeaveSelfServiceProps } from "@/components/leave/my-leave-self-service-view";
import {
  canOpenSelfLeave,
  type SelfServicePortal,
} from "@/lib/attendance/attendance-leave-navigation";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { safeServerCall } from "@/lib/errors/safe-server";
import { DEFAULT_LEAVE_CALENDAR } from "@/lib/leave/services/leave-calendar-engine";
import {
  getEmployeeLeaveBalanceSnapshot,
  getEmployeeLeaveCalendarData,
  getLeaveLookups,
  listEmployeeOwnLeaveRequests,
  ensurePendingHrLeaveAssignedToCeo,
} from "@/lib/leave/services/leave-queries";
import { hasPermission } from "@/lib/permissions/utils";
import type { UserProfile } from "@/types/auth";

/** Compose existing self-service reads for the selected attendance period. */
export async function getAttendanceLeaveData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  portal: SelfServicePortal,
  month: number,
  year: number,
): Promise<MyLeaveSelfServiceProps | null> {
  if (!canOpenSelfLeave(profile.permissionCodes, portal)) return null;
  const employeeId = profile.employee.id;
  const organizationId = profile.employee.organizationId;
  const canApply = hasPermission(profile.permissionCodes, "leave.create");
  const canEdit = canApply || hasPermission(profile.permissionCodes, "leave.edit");
  const canDelete = ["leave.delete", "leave.cancel", "leave.withdraw"].some(
    (code) => hasPermission(profile.permissionCodes, code),
  );
  // Preserve the existing HR self-service leave routing synchronization.
  if (portal === "hr") {
    void ensurePendingHrLeaveAssignedToCeo(organizationId).catch((error) => {
      console.error(
        "[leave] failed to assign pending HR leave to CEO",
        error instanceof Error ? error.message : error,
      );
    });
  }
  const loadLookups = canApply || (
    (portal === "employee" || portal === "accountant" || portal === "hr") && canEdit
  );
  const [balances, requests, calendar, applyLeaveLookups] = await Promise.all([
    safeServerCall(
      () => getEmployeeLeaveBalanceSnapshot(
        supabase, employeeId, year, undefined,
        portal === "system" ? undefined : organizationId,
      ),
      [],
      "[attendance-leave] balances",
    ),
    safeServerCall(
      () => listEmployeeOwnLeaveRequests(supabase, employeeId, 1, 50, { month, year }),
      [],
      "[attendance-leave] requests",
    ),
    safeServerCall(
      () => getEmployeeLeaveCalendarData(supabase, profile, month, year),
      { leaves: [], holidays: [], calendar: DEFAULT_LEAVE_CALENDAR },
      "[attendance-leave] calendar",
    ),
    loadLookups
      ? safeServerCall(
          () => getLeaveLookups(supabase, organizationId, portal === "system" ? undefined : {
            selfApplicant: {
              id: employeeId,
              label: `${profile.employee.firstName} ${profile.employee.lastName}`.trim(),
              code: profile.employee.employeeCode,
            },
          }),
          portal === "hr" ? null : {
            leaveTypes: [], departments: [], branches: [], employees: [],
            managers: [], approvers: [], employmentTypes: [],
          },
          "[attendance-leave] apply lookups",
        )
      : Promise.resolve(null),
  ]);
  return {
    canApply, canEdit, canDelete, employeeId, balances, requests, applyLeaveLookups,
    calendarMonth: month,
    calendarYear: year,
    calendarLeaves: calendar.leaves,
    calendarHolidays: calendar.holidays,
    calendarContext: calendar.calendar,
  };
}
