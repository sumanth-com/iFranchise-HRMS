import { createHmac, randomBytes } from "node:crypto";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { getApprovalTokenTtlHours } from "@/lib/approvals/constants";
import type {
  ApprovalRequestType,
  ApprovalTokenRow,
  TokenValidationFailure,
} from "@/lib/approvals/types";
import { getSupabaseServiceRoleKey } from "@/lib/supabase/env";
import type { NotificationModule } from "@/types/notifications";

const TOKEN_COLUMNS =
  "id, organization_id, request_type, source_module, source_record_id, approval_record_id, approver_employee_id, approver_user_id, role_code, token_hash, expires_at, consumed_at, consumed_action, status, deleted_at";

function hmacSecret(): string {
  // Prefer a dedicated secret; fall back to the service-role key which is
  // always present server-side. Either way the raw token is 256-bit random,
  // so links cannot be guessed, and only the HMAC is ever persisted.
  return process.env.APPROVAL_TOKEN_SECRET || getSupabaseServiceRoleKey();
}

export function hashApprovalToken(rawToken: string): string {
  return createHmac("sha256", hmacSecret()).update(rawToken).digest("hex");
}

export type CreateApprovalTokenParams = {
  organizationId: string;
  requestType: ApprovalRequestType;
  sourceModule: NotificationModule;
  sourceRecordId: string;
  approvalRecordId: string | null;
  approverEmployeeId: string;
  approverUserId: string | null;
  roleCode: string;
  createdBy?: string | null;
};

/**
 * Mints a single-use, HMAC-signed approval token. Returns the raw token (only
 * ever placed in the email link); the database stores its hash exclusively.
 */
export async function createApprovalToken(
  admin: AuthSupabaseClient,
  params: CreateApprovalTokenParams,
): Promise<{ rawToken: string; tokenId: string } | null> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashApprovalToken(rawToken);
  const expiresAt = new Date(
    Date.now() + getApprovalTokenTtlHours() * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await admin
    .schema("hrms")
    .from("email_approval_tokens")
    .insert({
      organization_id: params.organizationId,
      request_type: params.requestType,
      source_module: params.sourceModule,
      source_record_id: params.sourceRecordId,
      approval_record_id: params.approvalRecordId,
      approver_employee_id: params.approverEmployeeId,
      approver_user_id: params.approverUserId,
      role_code: params.roleCode,
      token_hash: tokenHash,
      expires_at: expiresAt,
      status: "active",
      created_by: params.createdBy ?? null,
      updated_by: params.createdBy ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(`[approvals] Failed to create token: ${error?.message}`);
    return null;
  }

  return { rawToken, tokenId: data.id };
}

async function findTokenRow(
  admin: AuthSupabaseClient,
  rawToken: string,
): Promise<ApprovalTokenRow | null> {
  const tokenHash = hashApprovalToken(rawToken);
  const { data, error } = await admin
    .schema("hrms")
    .from("email_approval_tokens")
    .select(TOKEN_COLUMNS)
    .eq("token_hash", tokenHash)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  return data as ApprovalTokenRow;
}

function validateTokenRow(
  row: ApprovalTokenRow | null,
): { ok: true; row: ApprovalTokenRow } | { ok: false; reason: TokenValidationFailure } {
  if (!row || row.status !== "active") return { ok: false, reason: "invalid" };
  if (row.consumed_at) return { ok: false, reason: "consumed" };
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, row };
}

/** Reads and validates a token WITHOUT consuming it (for landing-page preview). */
export async function peekApprovalToken(
  admin: AuthSupabaseClient,
  rawToken: string,
): Promise<{ ok: true; row: ApprovalTokenRow } | { ok: false; reason: TokenValidationFailure }> {
  const row = await findTokenRow(admin, rawToken);
  return validateTokenRow(row);
}

/** Like peek, but returns the row even if consumed/expired (for View Details + audit). */
export async function lookupApprovalToken(
  admin: AuthSupabaseClient,
  rawToken: string,
): Promise<ApprovalTokenRow | null> {
  return findTokenRow(admin, rawToken);
}

/**
 * Atomically claims (consumes) a valid token exactly once. The conditional
 * update on `consumed_at IS NULL` guarantees only one concurrent click wins,
 * preventing double-processing.
 */
export async function claimApprovalToken(
  admin: AuthSupabaseClient,
  rawToken: string,
  action: "approved" | "rejected",
  context: { ip?: string | null; userAgent?: string | null },
): Promise<
  | { ok: true; row: ApprovalTokenRow }
  | { ok: false; reason: TokenValidationFailure | "already_processed" }
> {
  const row = await findTokenRow(admin, rawToken);
  const validation = validateTokenRow(row);
  if (!validation.ok) {
    return {
      ok: false,
      reason: validation.reason === "consumed" ? "already_processed" : validation.reason,
    };
  }

  const { data, error } = await admin
    .schema("hrms")
    .from("email_approval_tokens")
    .update({
      consumed_at: new Date().toISOString(),
      consumed_action: action,
      consumed_ip: context.ip ?? null,
      consumed_user_agent: context.userAgent ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", validation.row.id)
    .is("consumed_at", null)
    .select(TOKEN_COLUMNS)
    .maybeSingle();

  if (error) return { ok: false, reason: "invalid" };
  if (!data) return { ok: false, reason: "already_processed" };

  return { ok: true, row: data as ApprovalTokenRow };
}

/** Best-effort rollback of a claim if execution failed after consuming. */
export async function releaseApprovalToken(
  admin: AuthSupabaseClient,
  tokenId: string,
): Promise<void> {
  await admin
    .schema("hrms")
    .from("email_approval_tokens")
    .update({
      consumed_at: null,
      consumed_action: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", tokenId);
}
