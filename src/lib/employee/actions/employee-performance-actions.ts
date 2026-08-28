"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { HR_HUB_ROUTES } from "@/lib/dashboard/hr-hub-routes";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import {
  getGoalById,
  getOneOnOneById,
  toggleGoalMilestone,
  updateKpiProgress,
} from "@/lib/performance/services/performance-mutations";
import {
  listFeedback,
  listGoals,
  listKpis,
  listOneOnOnes,
  listPromotions,
} from "@/lib/performance/services/performance-queries";
import { goalMilestoneToggleSchema, kpiProgressSchema } from "@/lib/validations/performance";
import { createClient } from "@/lib/supabase/server";
import type {
  FeedbackListItem,
  GoalDetail,
  GoalListItem,
  KpiListItem,
  OneOnOneDetail,
  OneOnOneListItem,
  PromotionListItem,
} from "@/types/performance";

async function requireEmployeeProfile() {
  return requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    PORTAL_PERMISSIONS.manager,
    PORTAL_PERMISSIONS.hr,
    PORTAL_PERMISSIONS.ceo,
    "performance.view",
  ]);
}

export async function fetchMyGoalsAction(): Promise<GoalListItem[]> {
  const profile = await requireEmployeeProfile();
  const supabase = await createClient();
  const result = await listGoals(supabase, profile, {
    page: 1,
    pageSize: 100,
    employeeId: profile.employee.id,
  });
  return result.data;
}

export async function fetchMyGoalDetailAction(goalId: string): Promise<GoalDetail | null> {
  const profile = await requireEmployeeProfile();
  const supabase = await createClient();
  const detail = await getGoalById(supabase, profile.employee.organizationId, goalId);
  if (!detail || detail.employeeId !== profile.employee.id) return null;
  return detail;
}

export async function toggleMyGoalMilestoneAction(input: unknown) {
  try {
    const profile = await requireEmployeeProfile();
    const supabase = await createClient();
    const parsed = goalMilestoneToggleSchema.parse(input);
    const detail = await getGoalById(
      supabase,
      profile.employee.organizationId,
      parsed.goalId,
    );
    if (!detail || detail.employeeId !== profile.employee.id) {
      return { success: false as const, message: "Goal not found" };
    }
    const progress = await toggleGoalMilestone(
      supabase,
      profile,
      parsed.goalId,
      parsed.milestoneId,
      parsed.isCompleted,
    );
    revalidatePath(EMPLOYEE_ROUTES.goals);
    revalidatePath(HR_HUB_ROUTES.myGoals);
    revalidatePath(PERFORMANCE_ROUTES.goals);
    revalidatePath(MANAGER_ROUTES.performanceGoals);
    return { success: true as const, data: progress };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update key result",
    };
  }
}

export async function fetchMyKpisAction(): Promise<KpiListItem[]> {
  const profile = await requireEmployeeProfile();
  const supabase = await createClient();
  const result = await listKpis(supabase, profile, {
    page: 1,
    pageSize: 100,
    employeeId: profile.employee.id,
  });
  return result.data;
}

function revalidateMyKpiPaths() {
  revalidatePath(PERFORMANCE_ROUTES.kpis);
  revalidatePath(`${HR_HUB_ROUTES.myGoals}/kpis`);
  revalidatePath(`${EMPLOYEE_ROUTES.goals}/kpis`);
  revalidatePath(MANAGER_ROUTES.performanceKpis);
  revalidatePath(`${MANAGER_ROUTES.goals}/kpis`);
}

export async function updateMyKpiProgressAction(input: unknown) {
  try {
    const profile = await requireEmployeeProfile();
    const supabase = await createClient();
    const parsed = kpiProgressSchema.parse(input);

    const { data: kpi } = await supabase
      .schema("hrms")
      .from("performance_kpis")
      .select("id, employee_id, kpi_status")
      .eq("id", parsed.kpiId)
      .eq("organization_id", profile.employee.organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!kpi || kpi.employee_id !== profile.employee.id) {
      return { success: false as const, message: "KPI not found" };
    }

    await updateKpiProgress(supabase, profile, parsed);
    revalidateMyKpiPaths();
    return { success: true as const, message: "KPI update saved" };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update KPI",
    };
  }
}

export async function fetchMyFeedbackAction(): Promise<FeedbackListItem[]> {
  const profile = await requireEmployeeProfile();
  const supabase = await createClient();
  const result = await listFeedback(supabase, profile, {
    page: 1,
    pageSize: 100,
    employeeId: profile.employee.id,
  });
  return result.data;
}

/**
 * The caller's own 1:1s, from either participant side. Returns the viewer id so the
 * list can show the other participant rather than a fixed column.
 */
export async function fetchMyOneOnOnesAction(): Promise<{
  meetings: OneOnOneListItem[];
  viewerEmployeeId: string;
}> {
  const profile = await requireEmployeeProfile();
  const supabase = await createClient();
  const result = await listOneOnOnes(supabase, profile, {
    page: 1,
    pageSize: 100,
    employeeId: profile.employee.id,
  });
  return { meetings: result.data, viewerEmployeeId: profile.employee.id };
}

export async function fetchMyOneOnOneDetailAction(meetingId: string): Promise<OneOnOneDetail | null> {
  const profile = await requireEmployeeProfile();
  const supabase = await createClient();
  const detail = await getOneOnOneById(
    supabase,
    profile.employee.organizationId,
    meetingId,
  );
  // Either participant owns the meeting equally.
  const isParticipant =
    detail?.employeeId === profile.employee.id ||
    detail?.managerEmployeeId === profile.employee.id;
  if (!detail || !isParticipant) return null;
  return detail;
}

export async function fetchMyPromotionsAction(): Promise<PromotionListItem[]> {
  const profile = await requireEmployeeProfile();
  const supabase = await createClient();
  const result = await listPromotions(supabase, profile, {
    page: 1,
    pageSize: 100,
    employeeId: profile.employee.id,
  });
  return result.data;
}
