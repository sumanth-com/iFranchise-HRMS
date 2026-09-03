import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { getEmployeeBranchId } from "@/lib/attendance/services/attendance-queries";
import type { LeaveCalendarContext, LeaveDurationBreakdown } from "@/lib/leave/services/leave-calendar-engine";
import { classifyCalendarDay } from "@/lib/leave/services/leave-calendar-engine";

const LEAVE_SYNC_PREFIX = "src:leave:";

function leaveSyncNote(leaveRequestId: string) {
  return `${LEAVE_SYNC_PREFIX}${leaveRequestId}`;
}

function hasCheckIn(checkInAt: string | null | undefined) {
  return Boolean(checkInAt);
}

/**
 * Approved leave writes on_leave attendance so payroll does not also treat
 * those days as unauthorised absence. Punched days are left for HR to correct.
 */
export async function syncAttendanceForApprovedLeave(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    employeeId: string;
    leaveRequestId: string;
    duration: LeaveDurationBreakdown;
  },
): Promise<void> {
  const branchId = await getEmployeeBranchId(supabase, input.employeeId);
  const note = leaveSyncNote(input.leaveRequestId);

  for (const day of input.duration.days) {
    if (day.counted <= 0) continue;
    if (day.class === "holiday") continue;

    const { data: existing } = await supabase
      .schema("hrms")
      .from("attendance")
      .select("id, check_in_at, notes")
      .eq("employee_id", input.employeeId)
      .eq("attendance_date", day.date)
      .is("deleted_at", null)
      .maybeSingle();

    if (hasCheckIn(existing?.check_in_at)) continue;

    const payload = {
      attendance_status: "on_leave" as const,
      notes: note,
      overtime_hours: 0,
      updated_by: profile.userId,
    };

    if (existing?.id) {
      await supabase
        .schema("hrms")
        .from("attendance")
        .update(payload)
        .eq("id", existing.id)
        .eq("organization_id", profile.employee.organizationId)
        .is("deleted_at", null);
      continue;
    }

    await supabase.schema("hrms").from("attendance").insert({
      organization_id: profile.employee.organizationId,
      branch_id: branchId,
      employee_id: input.employeeId,
      attendance_date: day.date,
      attendance_status: "on_leave",
      check_in_at: null,
      check_out_at: null,
      work_hours: 0,
      overtime_hours: 0,
      notes: note,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    });
  }
}

export async function clearAttendanceForLeaveRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    employeeId: string;
    leaveRequestId: string;
    duration?: LeaveDurationBreakdown | null;
    calendar?: LeaveCalendarContext;
  },
): Promise<void> {
  const note = leaveSyncNote(input.leaveRequestId);
  const dates = input.duration?.days.map((day) => day.date) ?? [];
  if (dates.length === 0) return;

  const { data: rows } = await supabase
    .schema("hrms")
    .from("attendance")
    .select("id, attendance_date, check_in_at, notes")
    .eq("employee_id", input.employeeId)
    .in("attendance_date", dates)
    .is("deleted_at", null);

  for (const row of rows ?? []) {
    if (hasCheckIn(row.check_in_at)) continue;
    if (!String(row.notes ?? "").includes(note)) continue;

    const dayClass = input.calendar
      ? classifyCalendarDay(String(row.attendance_date).slice(0, 10), input.calendar)
      : "working";
    const status =
      dayClass === "weekly_off" ? "week_off" : dayClass === "holiday" ? "holiday" : "absent";

    await supabase
      .schema("hrms")
      .from("attendance")
      .update({
        attendance_status: status,
        notes: null,
        overtime_hours: 0,
        updated_by: profile.userId,
      })
      .eq("id", row.id)
      .eq("organization_id", profile.employee.organizationId);
  }
}
