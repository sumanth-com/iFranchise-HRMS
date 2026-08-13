"use server";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import {
  buildCeoLeaveInsights,
  countManagersOnLeaveNextWeek,
  getCeoDepartmentLeaveOverview,
  getCeoForwardTargets,
  getCeoLeaveAnalytics,
  getCeoLeaveCalendar,
  getCeoLeaveDetail,
  getCeoLeaveLookups,
  getCeoLeaveSummary,
  listCeoApprovalQueue,
  listCeoTodaysLeave,
  listCeoUpcomingLeave,
} from "@/lib/ceo/services/ceo-leave-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import type {
  CeoApprovalQueueItem,
  CeoDepartmentLeaveOverview,
  CeoLeaveActionResult,
  CeoLeaveCalendar,
  CeoLeaveDetail,
  CeoLeaveFilters,
  CeoLeaveModuleData,
  CeoLeaveRecord,
} from "@/types/ceo-leave";
import {
  ceoLeaveCalendarSchema,
  ceoLeaveFiltersSchema,
} from "@/lib/validations/ceo-leave";

const VIEW_PERMISSIONS = [PORTAL_PERMISSIONS.ceo, "leave.view"];

function currentMonthYear() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export async function getCeoLeaveModuleData(
  rawFilters: CeoLeaveFilters = {},
): Promise<CeoLeaveModuleData> {
  const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
  const supabase = await createClient();
  const filters = ceoLeaveFiltersSchema.parse(rawFilters);
  const { month, year } = currentMonthYear();

  const [
    todaysLeave,
    upcomingLeave,
    approvalQueue,
    departmentOverview,
    analytics,
    calendar,
    lookups,
    forwardTargets,
    managersOnLeaveNextWeek,
  ] = await Promise.all([
    listCeoTodaysLeave(supabase, profile, filters),
    listCeoUpcomingLeave(supabase, profile, filters),
    listCeoApprovalQueue(supabase, profile),
    getCeoDepartmentLeaveOverview(supabase, profile, filters),
    getCeoLeaveAnalytics(supabase, profile),
    getCeoLeaveCalendar(supabase, profile, month, year),
    getCeoLeaveLookups(supabase, profile),
    getCeoForwardTargets(supabase, profile),
    countManagersOnLeaveNextWeek(supabase, profile),
  ]);

  const summary = await getCeoLeaveSummary(supabase, profile, approvalQueue.length);
  const insights = buildCeoLeaveInsights(
    departmentOverview,
    analytics,
    summary,
    managersOnLeaveNextWeek,
  );

  return {
    summary,
    todaysLeave,
    upcomingLeave,
    approvalQueue,
    departmentOverview,
    insights,
    analytics,
    calendar,
    lookups,
    forwardTargets,
    ceoEmployeeId: profile.employee.id,
  };
}

export async function fetchCeoLeaveListsAction(
  rawFilters: CeoLeaveFilters,
): Promise<
  CeoLeaveActionResult<{
    todaysLeave: CeoLeaveRecord[];
    upcomingLeave: CeoLeaveRecord[];
    departmentOverview: CeoDepartmentLeaveOverview[];
  }>
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const filters = ceoLeaveFiltersSchema.parse(rawFilters);

    const [todaysLeave, upcomingLeave, departmentOverview] = await Promise.all([
      listCeoTodaysLeave(supabase, profile, filters),
      listCeoUpcomingLeave(supabase, profile, filters),
      getCeoDepartmentLeaveOverview(supabase, profile, filters),
    ]);

    return { success: true, data: { todaysLeave, upcomingLeave, departmentOverview } };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load leave data",
    };
  }
}

export async function fetchCeoApprovalQueueAction(): Promise<
  CeoLeaveActionResult<CeoApprovalQueueItem[]>
> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const data = await listCeoApprovalQueue(supabase, profile);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load approval queue",
    };
  }
}

export async function fetchCeoLeaveDetailAction(
  leaveRequestId: string,
): Promise<CeoLeaveActionResult<CeoLeaveDetail>> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const data = await getCeoLeaveDetail(supabase, profile, leaveRequestId);
    if (!data) return { success: false, message: "Leave request not found" };
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load leave request",
    };
  }
}

export async function fetchCeoLeaveCalendarAction(
  month: number,
  year: number,
): Promise<CeoLeaveActionResult<CeoLeaveCalendar>> {
  try {
    const profile = await requireServerAnyPermission(VIEW_PERMISSIONS);
    const supabase = await createClient();
    const parsed = ceoLeaveCalendarSchema.parse({ month, year });
    const data = await getCeoLeaveCalendar(supabase, profile, parsed.month, parsed.year);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load leave calendar",
    };
  }
}

export async function approveCeoLeaveAction(
  _input: unknown,
): Promise<CeoLeaveActionResult> {
  return {
    success: false,
    message: "Only HR can approve leave requests.",
  };
}

export async function rejectCeoLeaveAction(
  _input: unknown,
): Promise<CeoLeaveActionResult> {
  return {
    success: false,
    message: "Only HR can reject leave requests.",
  };
}

export async function forwardCeoLeaveAction(
  _input: unknown,
): Promise<CeoLeaveActionResult> {
  return {
    success: false,
    message: "Only HR can manage leave approval workflow.",
  };
}
