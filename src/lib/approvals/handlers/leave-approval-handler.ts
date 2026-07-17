import { format } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import {
  approveLeaveRequest,
  rejectLeaveRequest,
} from "@/lib/leave/services/leave-mutations";
import { getCurrentBalanceYear } from "@/lib/leave/services/leave-utils";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type {
  ApprovalHandler,
  ApprovalRequestSummary,
  DecisionRecipient,
  PendingApprover,
} from "@/lib/approvals/types";
import type { UserProfile } from "@/types/auth";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "d MMM yyyy");
  } catch {
    return value;
  }
}

type LeaveSummaryRow = {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number | string;
  is_half_day: boolean;
  reason: string | null;
  leave_status: string;
  created_at: string;
  employees:
    | {
        employee_code: string;
        first_name: string;
        last_name: string;
        email: string | null;
        organization_id: string;
        departments: { name: string } | { name: string }[] | null;
      }
    | Array<{
        employee_code: string;
        first_name: string;
        last_name: string;
        email: string | null;
        organization_id: string;
        departments: { name: string } | { name: string }[] | null;
      }>
    | null;
  leave_types: { name: string; code: string } | { name: string; code: string }[] | null;
};

async function getLeaveTypeBalance(
  admin: AuthSupabaseClient,
  employeeId: string,
  leaveTypeId: string,
  balanceYear: number,
): Promise<number | null> {
  const { data } = await admin
    .schema("hrms")
    .from("leave_balances")
    .select("balance_days")
    .eq("employee_id", employeeId)
    .eq("leave_type_id", leaveTypeId)
    .eq("balance_year", balanceYear)
    .is("deleted_at", null)
    .maybeSingle();

  return data ? Number(data.balance_days) : null;
}

export const leaveApprovalHandler: ApprovalHandler = {
  type: "leave",
  sourceModule: "leave",

  async loadSummary(admin, sourceRecordId): Promise<ApprovalRequestSummary | null> {
    const { data, error } = await admin
      .schema("hrms")
      .from("leave_requests")
      .select(
        `
        id, employee_id, leave_type_id, start_date, end_date, total_days,
        is_half_day, reason, leave_status, created_at,
        employees:employee_id (
          employee_code, first_name, last_name, email, organization_id,
          departments:department_id (name)
        ),
        leave_types:leave_type_id (name, code)
      `,
      )
      .eq("id", sourceRecordId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error || !data) return null;

    const row = data as unknown as LeaveSummaryRow;
    const employee = unwrap(row.employees);
    const leaveType = unwrap(row.leave_types);
    const department = unwrap(employee?.departments ?? null);
    if (!employee) return null;

    const employeeName = `${employee.first_name} ${employee.last_name}`.trim();
    const balance = await getLeaveTypeBalance(
      admin,
      row.employee_id,
      row.leave_type_id,
      getCurrentBalanceYear(row.start_date),
    );

    const detailRows = [
      { label: "Employee", value: employeeName },
      { label: "Employee ID", value: employee.employee_code },
      { label: "Department", value: department?.name ?? "—" },
      { label: "Leave Type", value: leaveType?.name ?? "—" },
      { label: "Start Date", value: fmtDate(row.start_date) },
      { label: "End Date", value: fmtDate(row.end_date) },
      {
        label: "Total Days",
        value: `${Number(row.total_days)}${row.is_half_day ? " (half day)" : ""}`,
      },
      { label: "Submitted On", value: fmtDate(row.created_at) },
      {
        label: "Current Leave Balance",
        value: balance === null ? "—" : `${balance} day${balance === 1 ? "" : "s"}`,
      },
    ];

    return {
      organizationId: employee.organization_id,
      subject: "New Leave Request Awaiting Approval",
      heading: `Leave request from ${employeeName}`,
      employeeName,
      detailRows,
      reason: row.reason?.trim() || null,
      status: row.leave_status,
      isPending: row.leave_status === "pending",
    };
  },

  async getPendingApprovers(admin, sourceRecordId): Promise<PendingApprover[]> {
    const { data, error } = await admin
      .schema("hrms")
      .from("leave_approvals")
      .select("id, approval_level, approver_employee_id, approval_status")
      .eq("leave_request_id", sourceRecordId)
      .eq("approval_status", "pending")
      .is("deleted_at", null)
      .order("approval_level", { ascending: true });

    if (error || !data?.length) return [];

    const activeLevel = data[0].approval_level;
    return data
      .filter((row) => row.approval_level === activeLevel)
      .map((row) => ({
        employeeId: row.approver_employee_id,
        approvalRecordId: row.id,
        level: row.approval_level,
      }));
  },

  async approve(admin, profile: UserProfile, sourceRecordId, comments) {
    await approveLeaveRequest(admin, profile, sourceRecordId, comments);
  },

  async reject(admin, profile: UserProfile, sourceRecordId, reason) {
    await rejectLeaveRequest(admin, profile, sourceRecordId, reason);
  },

  async markActedViaEmail(admin, sourceRecordId, approverEmployeeId) {
    await admin
      .schema("hrms")
      .from("leave_approvals")
      .update({ acted_via: "email", updated_at: new Date().toISOString() })
      .eq("leave_request_id", sourceRecordId)
      .eq("approver_employee_id", approverEmployeeId)
      .in("approval_status", ["approved", "rejected"]);
  },

  detailPath(sourceRecordId, roleCode) {
    if (roleCode === "manager") return MANAGER_ROUTES.leaveDetail(sourceRecordId);
    return LEAVE_ROUTES.detail(sourceRecordId);
  },

  async decisionRecipient(admin, sourceRecordId): Promise<DecisionRecipient | null> {
    const { data } = await admin
      .schema("hrms")
      .from("leave_requests")
      .select("employee_id, employees:employee_id (first_name, last_name, email)")
      .eq("id", sourceRecordId)
      .maybeSingle();

    if (!data) return null;
    const employee = unwrap(
      data.employees as
        | { first_name: string; last_name: string; email: string | null }
        | { first_name: string; last_name: string; email: string | null }[]
        | null,
    );
    if (!employee) return null;

    return {
      employeeId: data.employee_id as string,
      name: `${employee.first_name} ${employee.last_name}`.trim(),
      email: employee.email,
    };
  },
};
