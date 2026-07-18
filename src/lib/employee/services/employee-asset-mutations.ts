import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { fromHrms, unwrapRelation } from "@/lib/assets/services/assets-utils";
import type { UserProfile } from "@/types/auth";

/**
 * Confirms the assignment is active and belongs to the signed-in employee, and returns
 * the underlying asset id + name. Employees may only raise requests for their own assets.
 */
async function assertOwnedAssignment(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  assignmentId: string,
): Promise<{ assetId: string; assetName: string }> {
  const { data, error } = await fromHrms(supabase, "asset_assignments")
    .select("id, asset_id, employee_id, assignment_status, assets:asset_id(name)")
    .eq("id", assignmentId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Asset assignment not found");
  if (data.employee_id !== profile.employee.id) {
    throw new Error("You can only raise requests for assets assigned to you");
  }
  if (data.assignment_status !== "active") {
    throw new Error("This asset is no longer assigned to you");
  }
  return {
    assetId: data.asset_id,
    assetName: unwrapRelation(data.assets)?.name ?? "Asset",
  };
}

type ReportIssueInput = {
  assignmentId: string;
  issueType: string;
  severity: string;
  description: string;
};

/**
 * Logs an employee-reported asset issue as a real `asset_maintenance` record (status
 * pending) so it appears in the asset's maintenance history and in HR/IT's maintenance
 * queue for action.
 */
export async function employeeReportAssetIssue(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ReportIssueInput,
): Promise<void> {
  const { assetId } = await assertOwnedAssignment(supabase, profile, input.assignmentId);

  const { error } = await fromHrms(supabase, "asset_maintenance").insert({
    organization_id: profile.employee.organizationId,
    asset_id: assetId,
    maintenance_date: new Date().toISOString().slice(0, 10),
    issue: `Issue reported (${input.issueType}): ${input.description}`,
    maintenance_status: "pending",
    notes: `Severity: ${input.severity} · Raised by ${profile.employee.firstName} ${profile.employee.lastName}`.trim(),
    status: "active",
    created_by: profile.userId,
    updated_by: profile.userId,
  });

  if (error) throw new Error(error.message);
}

type ReplacementInput = {
  assignmentId: string;
  requestType: string;
  reason: string;
};

/**
 * Logs an employee replacement/upgrade/repair request as a real `asset_maintenance`
 * record (status pending) routed to HR/IT. The asset status is intentionally left
 * unchanged — the request is a review item, not an active repair.
 */
export async function employeeRequestAssetReplacement(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ReplacementInput,
): Promise<void> {
  const { assetId } = await assertOwnedAssignment(supabase, profile, input.assignmentId);

  const { error } = await fromHrms(supabase, "asset_maintenance").insert({
    organization_id: profile.employee.organizationId,
    asset_id: assetId,
    maintenance_date: new Date().toISOString().slice(0, 10),
    issue: `${input.requestType} requested: ${input.reason}`,
    maintenance_status: "pending",
    notes: `Employee request (${input.requestType}) by ${profile.employee.firstName} ${profile.employee.lastName}`.trim(),
    status: "active",
    created_by: profile.userId,
    updated_by: profile.userId,
  });

  if (error) throw new Error(error.message);
}
