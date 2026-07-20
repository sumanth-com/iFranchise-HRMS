"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import {
  employeeReportAssetIssue,
  employeeRequestAssetReplacement,
} from "@/lib/employee/services/employee-asset-mutations";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

const reportIssueSchema = z.object({
  assignmentId: z.string().uuid(),
  issueType: z.enum(["Hardware", "Software", "Physical Damage", "Performance", "Lost", "Other"]),
  severity: z.enum(["Low", "Medium", "High", "Critical"]),
  description: z.string().trim().min(5).max(1000),
});

const replacementSchema = z.object({
  assignmentId: z.string().uuid(),
  requestType: z.enum(["Replacement", "Upgrade", "Repair", "Temporary Device"]),
  reason: z.string().trim().min(5).max(1000),
});

export async function employeeReportAssetIssueAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      "asset.view",
    ]);
    const supabase = await createClient();
    const parsed = reportIssueSchema.parse(input);
    await employeeReportAssetIssue(supabase, profile, parsed);
    revalidatePath(EMPLOYEE_ROUTES.assets);
    revalidatePath("/dashboard/assets");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to report the issue",
    };
  }
}

export async function employeeRequestAssetReplacementAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      "asset.view",
    ]);
    const supabase = await createClient();
    const parsed = replacementSchema.parse(input);
    await employeeRequestAssetReplacement(supabase, profile, parsed);
    revalidatePath(EMPLOYEE_ROUTES.assets);
    revalidatePath("/dashboard/assets");
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to submit the request",
    };
  }
}
