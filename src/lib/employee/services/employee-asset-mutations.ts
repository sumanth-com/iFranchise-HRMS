import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { ASSET_STATUS_LABELS, CONDITION_LABELS } from "@/lib/assets/constants";
import { classifyEmployeeRequestKind } from "@/lib/assets/activity-utils";
import { fromHrms, unwrapRelation } from "@/lib/assets/services/assets-utils";
import type { UserProfile } from "@/types/auth";
import type { AssetCondition, AssetStatus } from "@/types/assets";

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

type UpdateStatusInput = {
  assignmentId: string;
  assetStatus: Extract<AssetStatus, "assigned" | "maintenance" | "lost">;
  condition: AssetCondition;
  notes?: string;
};

/**
 * Lets an employee report the current status and condition of an assigned asset.
 * HR sees the change on the asset record, assignment condition, and maintenance history.
 */
export async function employeeUpdateAssetStatus(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: UpdateStatusInput,
): Promise<void> {
  const { assetId, assetName } = await assertOwnedAssignment(
    supabase,
    profile,
    input.assignmentId,
  );

  const reporter = `${profile.employee.firstName} ${profile.employee.lastName}`.trim();
  const statusLabel = ASSET_STATUS_LABELS[input.assetStatus];
  const conditionLabel = CONDITION_LABELS[input.condition];
  const note = input.notes?.trim() || null;

  const { error: assetError } = await fromHrms(supabase, "assets")
    .update({
      asset_status: input.assetStatus,
      updated_by: profile.userId,
    })
    .eq("id", assetId)
    .eq("organization_id", profile.employee.organizationId);

  if (assetError) throw new Error(assetError.message);

  const { error: assignmentError } = await fromHrms(supabase, "asset_assignments")
    .update({
      condition_after: input.condition,
      remarks: note
        ? `Status: ${statusLabel} · Condition: ${conditionLabel} · ${note}`
        : `Status: ${statusLabel} · Condition: ${conditionLabel}`,
      updated_by: profile.userId,
    })
    .eq("id", input.assignmentId);

  if (assignmentError) throw new Error(assignmentError.message);

  const { error: maintenanceError } = await fromHrms(supabase, "asset_maintenance").insert({
    organization_id: profile.employee.organizationId,
    asset_id: assetId,
    maintenance_date: new Date().toISOString().slice(0, 10),
    issue: `Status reported: ${statusLabel} (${conditionLabel})${note ? ` — ${note}` : ""}`,
    maintenance_status: input.assetStatus === "maintenance" ? "pending" : "completed",
    notes: `Reported by ${reporter} for ${assetName}`,
    status: "active",
    created_by: profile.userId,
    updated_by: profile.userId,
  });

  if (maintenanceError) throw new Error(maintenanceError.message);
}

export async function employeeDeleteAssetRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  maintenanceId: string,
): Promise<void> {
  const { data, error } = await fromHrms(supabase, "asset_maintenance")
    .select("id, issue, created_by")
    .eq("id", maintenanceId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Request not found");
  if (data.created_by !== profile.userId) {
    throw new Error("You can only delete requests you submitted");
  }
  if (!classifyEmployeeRequestKind(data.issue)) {
    throw new Error("This record cannot be deleted from self-service");
  }

  const { data: deleted, error: deleteError } = await supabase
    .schema("hrms")
    .rpc("soft_delete_asset_maintenance", {
      p_maintenance_id: maintenanceId,
    });

  if (deleteError) throw new Error(deleteError.message);
  if (deleted !== true) throw new Error("Request not found");
}

type UpdateRequestInput =
  | {
      maintenanceId: string;
      kind: "report";
      issueType: string;
      severity: string;
      description: string;
    }
  | {
      maintenanceId: string;
      kind: "replace";
      requestType: string;
      reason: string;
    }
  | {
      maintenanceId: string;
      kind: "status";
      assetStatus: Extract<AssetStatus, "assigned" | "maintenance" | "lost">;
      condition: AssetCondition;
      notes?: string;
    };

export async function employeeUpdateAssetRequest(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: UpdateRequestInput,
): Promise<void> {
  const { data, error } = await fromHrms(supabase, "asset_maintenance")
    .select("id, issue, created_by, asset_id")
    .eq("id", input.maintenanceId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Request not found");
  if (data.created_by !== profile.userId) {
    throw new Error("You can only edit requests you submitted");
  }
  if (classifyEmployeeRequestKind(data.issue) !== input.kind) {
    throw new Error("This request cannot be edited that way");
  }

  const reporter = `${profile.employee.firstName} ${profile.employee.lastName}`.trim();
  let issue = data.issue;
  let notes: string | null = null;

  if (input.kind === "report") {
    issue = `Issue reported (${input.issueType}): ${input.description}`;
    notes = `Severity: ${input.severity} · Raised by ${reporter}`.trim();
  } else if (input.kind === "replace") {
    issue = `${input.requestType} requested: ${input.reason}`;
    notes = `Employee request (${input.requestType}) by ${reporter}`.trim();
  } else {
    const statusLabel = ASSET_STATUS_LABELS[input.assetStatus];
    const conditionLabel = CONDITION_LABELS[input.condition];
    const note = input.notes?.trim() || null;
    issue = `Status reported: ${statusLabel} (${conditionLabel})${note ? ` — ${note}` : ""}`;
    notes = `Reported by ${reporter}`;
  }

  const { error: updateError } = await fromHrms(supabase, "asset_maintenance")
    .update({
      issue,
      notes,
      updated_by: profile.userId,
    })
    .eq("id", input.maintenanceId);

  if (updateError) throw new Error(updateError.message);
}
