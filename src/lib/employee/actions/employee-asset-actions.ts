"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import {
  employeeDeleteAssetRequest,
  employeeReportAssetIssue,
  employeeRequestAssetReplacement,
  employeeRequestAssetReturn,
  employeeUpdateAssetRequest,
  employeeUpdateAssetStatus,
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

const updateStatusSchema = z.object({
  assignmentId: z.string().uuid(),
  assetStatus: z.enum(["assigned", "maintenance", "lost"]),
  condition: z.enum(["excellent", "good", "fair", "poor", "damaged"]),
  notes: z.string().trim().max(1000).optional(),
});

const returnRequestSchema = z.object({
  assignmentId: z.string().uuid(),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid return date"),
  notes: z.string().trim().max(1000).optional(),
});

function revalidateEmployeeAssets() {
  revalidatePath(EMPLOYEE_ROUTES.assets);
  revalidatePath(MANAGER_ROUTES.assets);
  revalidatePath("/dashboard/assets");
  revalidatePath("/dashboard/assets/team");
}

export async function employeeReportAssetIssueAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      "asset.view",
    ]);
    const supabase = await createClient();
    const parsed = reportIssueSchema.parse(input);
    await employeeReportAssetIssue(supabase, profile, parsed);
    revalidateEmployeeAssets();
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
      PORTAL_PERMISSIONS.manager,
      "asset.view",
    ]);
    const supabase = await createClient();
    const parsed = replacementSchema.parse(input);
    await employeeRequestAssetReplacement(supabase, profile, parsed);
    revalidateEmployeeAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to submit the request",
    };
  }
}

export async function employeeUpdateAssetStatusAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      "asset.view",
    ]);
    const supabase = await createClient();
    const parsed = updateStatusSchema.parse(input);
    await employeeUpdateAssetStatus(supabase, profile, parsed);
    revalidateEmployeeAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to send the status",
    };
  }
}

export async function employeeRequestAssetReturnAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      "asset.view",
    ]);
    const supabase = await createClient();
    const parsed = returnRequestSchema.parse(input);
    await employeeRequestAssetReturn(supabase, profile, parsed);
    revalidateEmployeeAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to send the return request",
    };
  }
}

export async function employeeUpdateAssetRequestAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      "asset.view",
    ]);
    const supabase = await createClient();
    const parsed = z
      .discriminatedUnion("kind", [
        z.object({
          kind: z.literal("report"),
          maintenanceId: z.string().uuid(),
          issueType: z.enum(["Hardware", "Software", "Physical Damage", "Performance", "Lost", "Other"]),
          severity: z.enum(["Low", "Medium", "High", "Critical"]),
          description: z.string().trim().min(5).max(1000),
        }),
        z.object({
          kind: z.literal("replace"),
          maintenanceId: z.string().uuid(),
          requestType: z.enum(["Replacement", "Upgrade", "Repair", "Temporary Device"]),
          reason: z.string().trim().min(5).max(1000),
        }),
        z.object({
          kind: z.literal("status"),
          maintenanceId: z.string().uuid(),
          assetStatus: z.enum(["assigned", "maintenance", "lost"]),
          condition: z.enum(["excellent", "good", "fair", "poor", "damaged"]),
          notes: z.string().trim().max(1000).optional(),
        }),
        z.object({
          kind: z.literal("return"),
          maintenanceId: z.string().uuid(),
          returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a valid return date"),
          notes: z.string().trim().max(1000).optional(),
        }),
      ])
      .parse(input);
    await employeeUpdateAssetRequest(supabase, profile, parsed);
    revalidateEmployeeAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update request",
    };
  }
}

export async function employeeDeleteAssetRequestAction(maintenanceId: string) {
  try {
    const profile = await requireServerAnyPermission([
      PORTAL_PERMISSIONS.employee,
      PORTAL_PERMISSIONS.manager,
      "asset.view",
    ]);
    const supabase = await createClient();
    await employeeDeleteAssetRequest(supabase, profile, maintenanceId);
    revalidateEmployeeAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to delete request",
    };
  }
}
