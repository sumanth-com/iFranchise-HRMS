"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  requireServerAnyPermission,
  requireServerPermission,
} from "@/lib/permissions/server";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { getLeaveRequestById } from "@/lib/leave/services/leave-detail";
import {
  approveLeaveRequest,
  cancelLeaveRequest,
  createLeaveRequest,
  rejectLeaveRequest,
} from "@/lib/leave/services/leave-mutations";
import {
  getLeaveCalendarData,
  getLeaveLookups,
  getLeaveSummary,
  getEmployeeLeaveBalanceSnapshot,
  listLeaveBalances,
  listLeaveRequests,
} from "@/lib/leave/services/leave-queries";
import {
  leaveApprovalSchema,
  leaveFormSchema,
  leaveListParamsSchema,
  leaveRejectSchema,
} from "@/lib/validations/leave";
import type {
  LeaveActionResult,
  LeaveBalanceItem,
  LeaveDetail,
  LeaveEmployeeBalanceSnapshot,
  LeaveListParams,
  LeaveListResult,
  LeaveLookups,
  LeaveSummary,
} from "@/types/leave";

async function getAuthenticatedSupabase() {
  return createClient();
}

export async function createLeaveRequestAction(
  input: unknown,
): Promise<LeaveActionResult<string>> {
  try {
    const profile = await requireServerPermission("leave.create");
    const supabase = await getAuthenticatedSupabase();
    const parsed = leaveFormSchema.parse(input);
    const id = await createLeaveRequest(supabase, profile, parsed);
    revalidatePath(LEAVE_ROUTES.list);
    revalidatePath(LEAVE_ROUTES.balances);
    return { success: true, data: id };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to submit leave request",
    };
  }
}

export async function approveLeaveRequestAction(
  input: unknown,
): Promise<LeaveActionResult> {
  try {
    const profile = await requireServerPermission("leave.approve");
    const supabase = await getAuthenticatedSupabase();
    const parsed = leaveApprovalSchema.parse(input);
    await approveLeaveRequest(
      supabase,
      profile,
      parsed.leaveRequestId,
      parsed.comments,
    );
    revalidatePath(LEAVE_ROUTES.list);
    revalidatePath(LEAVE_ROUTES.detail(parsed.leaveRequestId));
    revalidatePath(LEAVE_ROUTES.balances);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to approve leave request",
    };
  }
}

export async function rejectLeaveRequestAction(
  input: unknown,
): Promise<LeaveActionResult> {
  try {
    const profile = await requireServerPermission("leave.reject");
    const supabase = await getAuthenticatedSupabase();
    const parsed = leaveRejectSchema.parse(input);
    await rejectLeaveRequest(
      supabase,
      profile,
      parsed.leaveRequestId,
      parsed.comments ?? "",
    );
    revalidatePath(LEAVE_ROUTES.list);
    revalidatePath(LEAVE_ROUTES.detail(parsed.leaveRequestId));
    revalidatePath(LEAVE_ROUTES.balances);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to reject leave request",
    };
  }
}

export async function cancelLeaveRequestAction(
  leaveRequestId: string,
): Promise<LeaveActionResult> {
  try {
    const profile = await requireServerAnyPermission([
      "leave.cancel",
      "leave.withdraw",
    ]);
    const supabase = await getAuthenticatedSupabase();
    await cancelLeaveRequest(supabase, profile, leaveRequestId);
    revalidatePath(LEAVE_ROUTES.list);
    revalidatePath(LEAVE_ROUTES.detail(leaveRequestId));
    revalidatePath(LEAVE_ROUTES.balances);
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to cancel leave request",
    };
  }
}

export async function fetchLeaveRequestsAction(
  params: LeaveListParams,
): Promise<LeaveActionResult<LeaveListResult>> {
  try {
    const profile = await requireServerPermission("leave.view");
    const supabase = await getAuthenticatedSupabase();
    const parsed = leaveListParamsSchema.parse(params);
    const data = await listLeaveRequests(supabase, profile, parsed);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load leave requests",
    };
  }
}

export async function getLeaveDetailAction(
  leaveRequestId: string,
): Promise<LeaveActionResult<LeaveDetail>> {
  try {
    const profile = await requireServerPermission("leave.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await getLeaveRequestById(supabase, profile, leaveRequestId);
    if (!data) return { success: false, message: "Leave request not found" };
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load leave request",
    };
  }
}

export async function getLeaveLookupsAction(): Promise<LeaveActionResult<LeaveLookups>> {
  try {
    const profile = await requireServerPermission("leave.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await getLeaveLookups(supabase, profile.employee.organizationId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load leave lookups",
    };
  }
}

export async function getLeaveBalancesAction(
  balanceYear?: number,
): Promise<LeaveActionResult<LeaveBalanceItem[]>> {
  try {
    const profile = await requireServerPermission("leave_balance.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await listLeaveBalances(supabase, profile, balanceYear);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load leave balances",
    };
  }
}

export async function getLeaveCalendarAction(
  month: number,
  year: number,
): Promise<LeaveActionResult<Awaited<ReturnType<typeof getLeaveCalendarData>>>> {
  try {
    const profile = await requireServerPermission("leave.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await getLeaveCalendarData(supabase, profile, month, year);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load leave calendar",
    };
  }
}

export async function getLeaveSummaryAction(): Promise<LeaveActionResult<LeaveSummary>> {
  try {
    const profile = await requireServerPermission("leave.view");
    const supabase = await getAuthenticatedSupabase();
    const data = await getLeaveSummary(supabase, profile);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load leave summary",
    };
  }
}

export async function getEmployeeLeaveBalanceSnapshotAction(
  employeeId: string,
): Promise<LeaveActionResult<LeaveEmployeeBalanceSnapshot[]>> {
  try {
    await requireServerPermission("leave.create");
    const supabase = await getAuthenticatedSupabase();
    const data = await getEmployeeLeaveBalanceSnapshot(supabase, employeeId);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to load employee leave balances",
    };
  }
}
