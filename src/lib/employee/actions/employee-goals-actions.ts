"use server";

import { revalidatePath } from "next/cache";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import {
  getGoalById,
  toggleGoalMilestone,
} from "@/lib/performance/services/performance-mutations";
import { listGoals } from "@/lib/performance/services/performance-queries";
import { goalMilestoneToggleSchema } from "@/lib/validations/performance";
import { createClient } from "@/lib/supabase/server";
import type { GoalDetail, GoalListItem } from "@/types/performance";

export async function fetchMyGoalsAction(): Promise<GoalListItem[]> {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "performance.view",
  ]);
  const supabase = await createClient();
  const result = await listGoals(supabase, profile, {
    page: 1,
    pageSize: 100,
    employeeId: profile.employee.id,
  });
  return result.data;
}

export async function fetchMyGoalDetailAction(goalId: string): Promise<GoalDetail | null> {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "performance.view",
  ]);
  const supabase = await createClient();
  const detail = await getGoalById(
    supabase,
    profile.employee.organizationId,
    goalId,
  );
  if (!detail || detail.employeeId !== profile.employee.id) return null;
  return detail;
}

export async function toggleMyGoalMilestoneAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      "performance.view",
    ]);
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
    await toggleGoalMilestone(
      supabase,
      profile,
      parsed.goalId,
      parsed.milestoneId,
      parsed.isCompleted,
    );
    revalidatePath(EMPLOYEE_ROUTES.goals);
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update key result",
    };
  }
}
