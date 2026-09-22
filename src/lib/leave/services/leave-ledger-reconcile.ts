import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import {
  countAttendanceLeaveDaysByCode,
  mergeAttendanceAndRequestLeaveUsage,
} from "@/lib/leave/services/leave-attendance-usage";
import { isMonthlyAccrualLeaveCode } from "@/lib/leave/services/leave-monthly-accrual";
import { OPTIONAL_HOLIDAY_CODE } from "@/lib/leave/optional-holiday";
import { paidDaysFromLeaveRequest, roundLeaveDays } from "@/lib/leave/services/leave-usage";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";

const LEDGER_CODES = new Set(["CL", "EL", "PL"]);

type RequestRow = {
  leave_status: string;
  total_days: number | string;
  duration_breakdown: unknown;
  leave_type_id: string;
  leave_types: { code: string } | { code: string }[] | null;
};

function unwrapCode(value: RequestRow["leave_types"]): string {
  if (!value) return "";
  if (Array.isArray(value)) return String(value[0]?.code ?? "").toUpperCase();
  return String(value.code ?? "").toUpperCase();
}

/**
 * Rebuilds used/pending/available on the leave ledger from:
 * 1) 2026 attendance notes marked src:CL / src:EL / src:PL (sheet source of truth)
 * 2) approved/pending leave-request paid days
 * Usage is merged with max() so the same day is never double-counted across both sources.
 * LOP / P / H / sandwich / plain on_leave sync notes do not consume CL/EL.
 */
export async function reconcileEmployeePaidLeaveLedger(
  supabase: AuthSupabaseClient,
  employeeId: string,
  options?: { balanceYear?: number; actorUserId?: string | null },
): Promise<void> {
  const balanceYear = options?.balanceYear ?? getCurrentBalanceYear();
  const yearStart = `${balanceYear}-01-01`;
  const yearEnd = `${balanceYear}-12-31`;

  const [
    { data: balances, error: balanceError },
    { data: requests, error: requestError },
    { data: attendanceRows, error: attendanceError },
  ] = await Promise.all([
    supabase
      .schema("hrms")
      .from("leave_balances")
      .select(
        `id, leave_type_id, allocated_days, used_days, pending_days, balance_days,
         leave_types:leave_type_id (code, days_per_year)`,
      )
      .eq("employee_id", employeeId)
      .eq("balance_year", balanceYear)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("leave_requests")
      .select(
        `leave_status, total_days, duration_breakdown, leave_type_id,
         leave_types:leave_type_id (code)`,
      )
      .eq("employee_id", employeeId)
      .in("leave_status", ["approved", "pending"])
      .lte("start_date", yearEnd)
      .gte("end_date", yearStart)
      .is("deleted_at", null),
    supabase
      .schema("hrms")
      .from("attendance")
      .select("attendance_date, notes")
      .eq("employee_id", employeeId)
      .gte("attendance_date", yearStart)
      .lte("attendance_date", yearEnd)
      .is("deleted_at", null),
  ]);

  if (balanceError) {
    console.error("[leave] ledger reconcile load balances failed", balanceError.message);
    return;
  }
  if (requestError) {
    console.error("[leave] ledger reconcile load requests failed", requestError.message);
    return;
  }
  if (attendanceError) {
    console.error("[leave] ledger reconcile load attendance failed", attendanceError.message);
    return;
  }

  const attendanceUsed = countAttendanceLeaveDaysByCode(attendanceRows ?? []);
  const requestUsedByType = new Map<string, number>();
  const pendingByType = new Map<string, number>();

  for (const row of (requests ?? []) as RequestRow[]) {
    const code = unwrapCode(row.leave_types);
    if (!LEDGER_CODES.has(code) || code === OPTIONAL_HOLIDAY_CODE) continue;
    const paid = paidDaysFromLeaveRequest(row);
    if (row.leave_status === "approved") {
      requestUsedByType.set(code, roundLeaveDays((requestUsedByType.get(code) ?? 0) + paid));
    } else {
      pendingByType.set(code, roundLeaveDays((pendingByType.get(code) ?? 0) + paid));
    }
  }

  const usedByType = new Map<string, number>();
  for (const code of LEDGER_CODES) {
    if (code === OPTIONAL_HOLIDAY_CODE) continue;
    const attendanceDays =
      code === "CL" || code === "EL" || code === "PL" ? attendanceUsed[code] : 0;
    const requestDays = requestUsedByType.get(code) ?? 0;
    usedByType.set(
      code,
      mergeAttendanceAndRequestLeaveUsage({
        attendanceDays,
        requestPaidDays: requestDays,
      }),
    );
  }

  const now = new Date().toISOString();

  for (const row of balances ?? []) {
    const leaveType = Array.isArray(row.leave_types) ? row.leave_types[0] : row.leave_types;
    const code = String(leaveType?.code ?? "").toUpperCase();
    if (!LEDGER_CODES.has(code)) continue;

    const daysPerYear = Math.max(0, Number(leaveType?.days_per_year ?? 0));
    // Record every genuine CL/EL/PL day from attendance + requests. Do not clamp
    // used to allocated — attendance may exceed a stale/monthly allocated seed
    // (esp. intern/probation monthly CL). Available is still floored at 0.
    const used = roundLeaveDays(Math.max(0, usedByType.get(code) ?? 0));
    const pending = roundLeaveDays(Math.max(0, pendingByType.get(code) ?? 0));
    const allocated = isMonthlyAccrualLeaveCode(code)
      ? roundLeaveDays(Math.max(0, Number(row.allocated_days), used + pending))
      : roundLeaveDays(
          Math.max(Number(row.allocated_days) || 0, daysPerYear, used + pending),
        );
    const balanceDays = roundLeaveDays(Math.max(0, allocated - used - pending));

    const same =
      roundLeaveDays(Number(row.allocated_days)) === allocated &&
      roundLeaveDays(Number(row.used_days)) === used &&
      roundLeaveDays(Number(row.pending_days)) === pending &&
      roundLeaveDays(Number(row.balance_days)) === balanceDays;
    if (same) continue;

    const { error: updateError } = await supabase
      .schema("hrms")
      .from("leave_balances")
      .update({
        allocated_days: allocated,
        used_days: used,
        pending_days: pending,
        balance_days: balanceDays,
        updated_at: now,
        ...(options?.actorUserId ? { updated_by: options.actorUserId } : {}),
      })
      .eq("id", row.id)
      .is("deleted_at", null);

    if (updateError) {
      console.error("[leave] ledger reconcile update failed", updateError.message);
    }
  }
}
