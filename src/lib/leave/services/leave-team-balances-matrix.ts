import { roundLeaveDays } from "@/lib/leave/services/leave-usage";
import type { TeamLeaveBalanceRow, TeamLeaveUsageEntry } from "@/types/leave";

const BALANCE_CODES = new Set(["CL", "EL", "OH"]);

function emptyTypeTotals() {
  return { available: 0, used: 0, pending: 0 };
}

function emptyUsage(): {
  clUsage: TeamLeaveUsageEntry[];
  elUsage: TeamLeaveUsageEntry[];
  ohUsage: TeamLeaveUsageEntry[];
  lopUsage: TeamLeaveUsageEntry[];
} {
  return { clUsage: [], elUsage: [], ohUsage: [], lopUsage: [] };
}

/**
 * Pivot ledger rows + LOP totals into one row per employee.
 * Pure helper — unit-tested; used by listTeamLeaveBalanceRows.
 * Month-scoped used/usage are applied by the caller after this pivot.
 */
export function buildTeamLeaveBalanceRows(input: {
  employees: Array<{
    id: string;
    employeeCode: string;
    employeeName: string;
    departmentName: string | null;
    employmentTypeName: string | null;
  }>;
  balances: Array<{
    employeeId: string;
    leaveTypeCode: string;
    balanceDays: number;
    usedDays: number;
    pendingDays: number;
    allocatedDays?: number;
  }>;
  lopByEmployeeId: Map<string, number>;
  /** When set, overrides ledger OH available/used with My Leave–aligned values. */
  ohByEmployeeId?: Map<
    string,
    { allowed: number; used: number; remaining: number }
  >;
  /** Month-scoped used totals (overrides ledger used for CL/EL/OH display columns). */
  monthUsedByEmployeeId?: Map<
    string,
    { cl: number; el: number; oh: number; lop: number }
  >;
  usageByEmployeeId?: Map<
    string,
    {
      clUsage: TeamLeaveUsageEntry[];
      elUsage: TeamLeaveUsageEntry[];
      ohUsage: TeamLeaveUsageEntry[];
      lopUsage: TeamLeaveUsageEntry[];
    }
  >;
}): TeamLeaveBalanceRow[] {
  const byEmployee = new Map<
    string,
    {
      CL: ReturnType<typeof emptyTypeTotals>;
      EL: ReturnType<typeof emptyTypeTotals>;
      OH: ReturnType<typeof emptyTypeTotals> & { allocated: number };
    }
  >();

  for (const balance of input.balances) {
    const code = String(balance.leaveTypeCode ?? "").toUpperCase();
    if (!BALANCE_CODES.has(code)) continue;
    let bucket = byEmployee.get(balance.employeeId);
    if (!bucket) {
      bucket = {
        CL: emptyTypeTotals(),
        EL: emptyTypeTotals(),
        OH: { ...emptyTypeTotals(), allocated: 0 },
      };
      byEmployee.set(balance.employeeId, bucket);
    }
    const target = bucket[code as "CL" | "EL" | "OH"];
    target.available = roundLeaveDays(Math.max(0, balance.balanceDays));
    target.used = roundLeaveDays(Math.max(0, balance.usedDays));
    target.pending = roundLeaveDays(Math.max(0, balance.pendingDays));
    if (code === "OH") {
      bucket.OH.allocated = roundLeaveDays(
        Math.max(0, Number(balance.allocatedDays ?? balance.balanceDays + balance.usedDays)),
      );
    }
  }

  return input.employees.map((employee) => {
    const totals = byEmployee.get(employee.id) ?? {
      CL: emptyTypeTotals(),
      EL: emptyTypeTotals(),
      OH: { ...emptyTypeTotals(), allocated: 0 },
    };
    const ohOverride = input.ohByEmployeeId?.get(employee.id);
    const monthUsed = input.monthUsedByEmployeeId?.get(employee.id);
    const usage = input.usageByEmployeeId?.get(employee.id) ?? emptyUsage();

    const ohAllowed = ohOverride
      ? ohOverride.allowed
      : roundLeaveDays(Math.max(totals.OH.allocated, totals.OH.available + totals.OH.used));

    return {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.employeeName,
      departmentName: employee.departmentName,
      employmentTypeName: employee.employmentTypeName,
      clAvailable: totals.CL.available,
      clUsed: monthUsed ? monthUsed.cl : totals.CL.used,
      clYearUsed: totals.CL.used,
      elAvailable: totals.EL.available,
      elUsed: monthUsed ? monthUsed.el : totals.EL.used,
      elYearUsed: totals.EL.used,
      ohAvailable: ohOverride
        ? ohOverride.remaining
        : totals.OH.available,
      ohUsed: monthUsed
        ? monthUsed.oh
        : ohOverride
          ? ohOverride.used
          : totals.OH.used,
      ohAllowed,
      lopDays: monthUsed
        ? monthUsed.lop
        : roundLeaveDays(Math.max(0, input.lopByEmployeeId.get(employee.id) ?? 0)),
      pendingDays: roundLeaveDays(
        Math.max(0, totals.CL.pending + totals.EL.pending + totals.OH.pending),
      ),
      clUsage: usage.clUsage ?? [],
      elUsage: usage.elUsage ?? [],
      ohUsage: usage.ohUsage ?? [],
      lopUsage: usage.lopUsage ?? [],
    };
  });
}
