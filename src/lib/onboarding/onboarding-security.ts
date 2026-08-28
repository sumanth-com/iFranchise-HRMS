import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { hmacSha256Hex } from "@/lib/security/hmac-utils";
import { hashEmailVerificationToken } from "@/lib/security/signed-flow-tokens";
import { getOnboardingTokenSecret } from "@/lib/security/token-secrets";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ONBOARDING_INVITATION_TTL_HOURS,
  ONBOARDING_OTP_TTL_MINUTES,
  ONBOARDING_SESSION_TTL_DAYS,
} from "@/lib/onboarding/constants";

const scryptAsync = promisify(scrypt);

function secret(): string {
  return getOnboardingTokenSecret();
}

export function hashOnboardingToken(raw: string): string {
  return hmacSha256Hex(secret(), raw);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashBuf = Buffer.from(hash, "hex");
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 1000000));
}

export function hashOtp(code: string): string {
  return hashEmailVerificationToken(`otp:${code}`);
}

export async function createOnboardingInvitationToken(
  caseId: string,
  organizationId: string,
  createdBy?: string | null,
): Promise<{ rawToken: string; expiresAt: string }> {
  const admin = createAdminClient();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashOnboardingToken(rawToken);
  const expiresAt = new Date(
    Date.now() + ONBOARDING_INVITATION_TTL_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await admin.schema("hrms").from("onboarding_invitation_tokens").insert({
    organization_id: organizationId,
    case_id: caseId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    status: "active",
    created_by: createdBy ?? null,
  });

  if (error) throw new Error(error.message);
  return { rawToken, expiresAt };
}

export async function revokeActiveInvitationTokens(caseId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .schema("hrms")
    .from("onboarding_invitation_tokens")
    .update({ status: "inactive", updated_at: now })
    .eq("case_id", caseId)
    .eq("status", "active")
    .is("consumed_at", null)
    .is("deleted_at", null);
}

export async function revokeActiveInvitationTokensExcept(
  caseId: string,
  exceptTokenHash: string,
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .schema("hrms")
    .from("onboarding_invitation_tokens")
    .update({ status: "inactive", updated_at: now })
    .eq("case_id", caseId)
    .eq("status", "active")
    .neq("token_hash", exceptTokenHash)
    .is("consumed_at", null)
    .is("deleted_at", null);
}

export async function consumeOnboardingInvitationToken(rawToken: string): Promise<void> {
  const admin = createAdminClient();
  const tokenHash = hashOnboardingToken(rawToken);
  const now = new Date().toISOString();
  const { error } = await admin
    .schema("hrms")
    .from("onboarding_invitation_tokens")
    .update({
      consumed_at: now,
      status: "inactive",
      updated_at: now,
    })
    .eq("token_hash", tokenHash)
    .is("consumed_at", null)
    .eq("status", "active")
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export type ValidatedInvitation = {
  caseId: string;
  organizationId: string;
  personalEmail: string;
  fullName: string;
  status: string;
};

export async function portalAccountHasPassword(caseId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_portal_accounts")
    .select("password_hash")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return typeof data?.password_hash === "string" && data.password_hash.length > 0;
}

type PortalAccountRow = {
  case_id: string;
  personal_email: string;
  password_hash: string | null;
  otp_hash: string | null;
  otp_expires_at: string | null;
  is_active: boolean | null;
  auth_user_id: string | null;
};

const PORTAL_ACCOUNT_COLUMNS =
  "case_id, personal_email, password_hash, otp_hash, otp_expires_at, is_active, auth_user_id, updated_at";

/**
 * `personal_email` is not unique on onboarding_portal_accounts — re-onboarding or an
 * archived case leaves a second row behind for the same address. A `.maybeSingle()`
 * read fails outright on those rows, which broke password login, verification codes
 * and password reset for every affected candidate. Read all matches instead and pick
 * the account attached to a still-open invitation, preferring one that already has a
 * password, so the choice is deterministic rather than an error.
 */
async function findPortalAccountByEmail(email: string): Promise<PortalAccountRow | null> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();

  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_portal_accounts")
    .select(PORTAL_ACCOUNT_COLUMNS)
    .eq("personal_email", normalized)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as PortalAccountRow[];
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0];

  const { data: caseRows, error: caseError } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select("id, status, deleted_at, cancelled_at, archived_at, invitation_sent_at")
    .in(
      "id",
      rows.map((row) => row.case_id),
    );

  if (caseError) throw new Error(caseError.message);

  const openCaseIds = new Set(
    (caseRows ?? []).filter((row) => isInvitedOnboardingCase(row)).map((row) => row.id),
  );
  const openRows = rows.filter((row) => openCaseIds.has(row.case_id));
  const candidates = openRows.length > 0 ? openRows : rows;

  return candidates.find((row) => row.password_hash) ?? candidates[0];
}

export async function onboardingEmailAlreadyHasPassword(email: string): Promise<boolean> {
  const account = await findPortalAccountByEmail(email);
  return typeof account?.password_hash === "string" && account.password_hash.length > 0;
}

export async function validateOnboardingInvitationToken(
  rawToken: string,
): Promise<
  | { ok: true; data: ValidatedInvitation }
  | { ok: false; reason: string; personalEmail?: string }
> {
  const admin = createAdminClient();
  const tokenHash = hashOnboardingToken(rawToken);

  const { data: tokenRow, error } = await admin
    .schema("hrms")
    .from("onboarding_invitation_tokens")
    .select("id, case_id, organization_id, expires_at, consumed_at, status")
    .eq("token_hash", tokenHash)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !tokenRow) return { ok: false, reason: "Invalid or expired invitation link." };

  // Revoked by a newer invite (not yet consumed) — candidate must use the latest email link.
  if (tokenRow.status !== "active" && !tokenRow.consumed_at) {
    return { ok: false, reason: "This invitation is no longer active." };
  }

  const { data: caseRow, error: caseError } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select("id, personal_email, full_name, status, deleted_at, cancelled_at, archived_at")
    .eq("id", tokenRow.case_id)
    .maybeSingle();

  if (caseError || !caseRow || caseRow.deleted_at) {
    return { ok: false, reason: "Onboarding case not found." };
  }
  if (caseRow.cancelled_at || caseRow.archived_at) {
    return { ok: false, reason: "This onboarding has been cancelled or archived." };
  }

  const hasPassword = await portalAccountHasPassword(tokenRow.case_id);
  if (hasPassword) {
    return {
      ok: false,
      reason: "PASSWORD_ALREADY_SET",
      personalEmail: caseRow.personal_email,
    };
  }

  if (!tokenRow.consumed_at && new Date(tokenRow.expires_at) < new Date()) {
    return { ok: false, reason: "This invitation link has expired." };
  }

  return {
    ok: true,
    data: {
      caseId: caseRow.id,
      organizationId: tokenRow.organization_id,
      personalEmail: caseRow.personal_email,
      fullName: caseRow.full_name,
      status: caseRow.status,
    },
  };
}

export async function markInvitationViewed(caseId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .schema("hrms")
    .from("onboarding_cases")
    .update({
      invitation_viewed_at: now,
      status: "invitation_viewed",
      updated_at: now,
    })
    .eq("id", caseId)
    .in("status", ["invitation_sent", "draft"]);
}

export async function createPortalSession(caseId: string): Promise<string> {
  await revokePortalSessions(caseId);
  const admin = createAdminClient();
  const rawSession = randomBytes(32).toString("base64url");
  const sessionHash = hashOnboardingToken(`session:${rawSession}`);
  const expiresAt = new Date(
    Date.now() + ONBOARDING_SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { error } = await admin.schema("hrms").from("onboarding_portal_sessions").insert({
    case_id: caseId,
    session_hash: sessionHash,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
  return rawSession;
}

export async function validatePortalSession(rawSession: string): Promise<string | null> {
  const admin = createAdminClient();
  const sessionHash = hashOnboardingToken(`session:${rawSession}`);

  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_portal_sessions")
    .select("case_id, expires_at, revoked_at")
    .eq("session_hash", sessionHash)
    .maybeSingle();

  if (error || !data || data.revoked_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data.case_id;
}

export async function revokePortalSessions(caseId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .schema("hrms")
    .from("onboarding_portal_sessions")
    .update({ revoked_at: now })
    .eq("case_id", caseId)
    .is("revoked_at", null);
}

/** Ensures a portal account row exists and is active when an invitation is sent. */
export async function ensurePortalAccountForInvitation(caseId: string, email: string) {
  const admin = createAdminClient();
  const { error } = await admin.schema("hrms").from("onboarding_portal_accounts").upsert(
    {
      case_id: caseId,
      personal_email: email.trim().toLowerCase(),
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "case_id" },
  );
  if (error) throw new Error(error.message);
}

const CLOSED_ONBOARDING_STATUSES = new Set([
  "cancelled",
  "archived",
  "completed",
  "rejected",
  "employee_created",
]);

function isInvitedOnboardingCase(row: {
  status: string;
  deleted_at?: string | null;
  cancelled_at?: string | null;
  archived_at?: string | null;
  invitation_sent_at?: string | null;
}) {
  if (row.deleted_at || row.cancelled_at || row.archived_at) return false;
  if (CLOSED_ONBOARDING_STATUSES.has(row.status)) return false;
  if (row.status === "draft" && !row.invitation_sent_at) return false;
  return true;
}

/**
 * Find the invited onboarding case for a personal email and ensure a portal
 * account row exists. Used by first-time password setup, OTP, and forgot-password
 * so invited candidates can continue even if the portal account row was missing.
 */
export async function resolveInvitedOnboardingByEmail(
  email: string,
): Promise<{ caseId: string } | null> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  const caseFields =
    "id, status, deleted_at, cancelled_at, archived_at, invitation_sent_at";

  const account = await findPortalAccountByEmail(normalized);

  if (account?.case_id) {
    const { data: caseRow, error: caseError } = await admin
      .schema("hrms")
      .from("onboarding_cases")
      .select(caseFields)
      .eq("id", account.case_id)
      .maybeSingle();

    if (caseError) throw new Error(caseError.message);
    if (caseRow && isInvitedOnboardingCase(caseRow)) {
      await ensurePortalAccountForInvitation(account.case_id, normalized);
      return { caseId: account.case_id };
    }
  }

  const { data: cases, error: casesError } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select(caseFields)
    .eq("personal_email", normalized)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(8);

  if (casesError) throw new Error(casesError.message);

  const match = (cases ?? []).find((row) => isInvitedOnboardingCase(row));
  if (!match) return null;

  await ensurePortalAccountForInvitation(match.id, normalized);
  return { caseId: match.id };
}

export async function storePortalPassword(caseId: string, email: string, password: string) {
  const admin = createAdminClient();
  const passwordHash = await hashPassword(password);
  const normalizedEmail = email.trim().toLowerCase();

  const { error: baseError } = await admin.schema("hrms").from("onboarding_portal_accounts").upsert(
    {
      case_id: caseId,
      personal_email: normalizedEmail,
      password_hash: passwordHash,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "case_id" },
  );
  if (baseError) throw new Error(baseError.message);

  try {
    const authUserId = await provisionPortalAuthUser(caseId, normalizedEmail, password);
    await linkPortalAuthUserId(caseId, authUserId);
  } catch (authError) {
    // Portal login still works via password_hash; auth user links main portal after migration.
    console.error("[onboarding] auth user provisioning:", authError);
  }
}

async function linkPortalAuthUserId(caseId: string, authUserId: string): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .schema("hrms")
    .from("onboarding_portal_accounts")
    .update({
      auth_user_id: authUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("case_id", caseId);

  if (!error) return;

  const msg = error.message.toLowerCase();
  if (msg.includes("auth_user_id") && (msg.includes("schema cache") || msg.includes("column"))) {
    return;
  }
  throw new Error(error.message);
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();

  const { data: rpcId, error: rpcError } = await admin
    .schema("hrms")
    .rpc("find_auth_user_id_by_email", { p_email: normalized });

  if (!rpcError && rpcId) {
    return rpcId as string;
  }

  if (rpcError && !rpcError.message.toLowerCase().includes("find_auth_user_id_by_email")) {
    // Function missing — fall back to paginated list.
  }

  let page = 1;
  const perPage = 1000;
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match?.id) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

/** Creates (or updates) a Supabase auth user so onboarding password works on the main portal later. */
export async function provisionPortalAuthUser(
  caseId: string,
  personalEmail: string,
  password: string,
): Promise<string> {
  const admin = createAdminClient();
  const email = personalEmail.trim().toLowerCase();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      onboarding_case_id: caseId,
      source: "onboarding_portal",
    },
  });

  if (!error && data.user?.id) {
    return data.user.id;
  }

  const message = error?.message?.toLowerCase() ?? "";
  const alreadyExists =
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("user already");

  if (alreadyExists) {
    const existingUserId = await findAuthUserIdByEmail(email);
    if (!existingUserId) {
      throw new Error(
        "This email is already registered. Sign in with your password below, or contact HR for assistance.",
      );
    }
    const { error: updateError } = await admin.auth.admin.updateUserById(existingUserId, {
      password,
      email_confirm: true,
      user_metadata: {
        onboarding_case_id: caseId,
        source: "onboarding_portal",
      },
    });
    if (updateError) throw new Error(updateError.message);
    return existingUserId;
  }

  throw new Error(
    error?.message?.includes("already")
      ? "This email is already registered. Sign in with your password below, or contact HR for assistance."
      : (error?.message ?? "Failed to create portal auth user"),
  );
}

export async function getOnboardingPortalAuthUserId(caseId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("onboarding_portal_accounts")
    .select("auth_user_id")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.auth_user_id ?? null;
}

export async function storePortalOtp(caseId: string, email: string, otp: string) {
  const admin = createAdminClient();
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + ONBOARDING_OTP_TTL_MINUTES * 60 * 1000).toISOString();
  // Update-only fields so an existing password_hash is never wiped by OTP upsert.
  const { data: existing, error: existingError } = await admin
    .schema("hrms")
    .from("onboarding_portal_accounts")
    .select("case_id")
    .eq("case_id", caseId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const { error } = await admin
      .schema("hrms")
      .from("onboarding_portal_accounts")
      .update({
        personal_email: email.toLowerCase(),
        otp_hash: otpHash,
        otp_expires_at: expiresAt,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("case_id", caseId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await admin.schema("hrms").from("onboarding_portal_accounts").insert({
    case_id: caseId,
    personal_email: email.toLowerCase(),
    otp_hash: otpHash,
    otp_expires_at: expiresAt,
    is_active: true,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function verifyPortalLogin(
  email: string,
  password: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const account = await findPortalAccountByEmail(email);

  if (!account || !account.is_active || !account.password_hash) return null;
  const valid = await verifyPassword(password, account.password_hash);
  if (!valid) return null;

  if (!account.auth_user_id) {
    try {
      const authUserId = await provisionPortalAuthUser(
        account.case_id,
        account.personal_email,
        password,
      );
      await linkPortalAuthUserId(account.case_id, authUserId);
    } catch {
      // Password hash login still valid for onboarding portal.
    }
  }

  const { data: caseRow } = await admin
    .schema("hrms")
    .from("onboarding_cases")
    .select("id, onboarding_account_active, status, deleted_at")
    .eq("id", account.case_id)
    .maybeSingle();

  if (!caseRow || caseRow.deleted_at || !caseRow.onboarding_account_active) return null;
  if (["cancelled", "archived", "completed", "rejected"].includes(caseRow.status)) return null;

  await admin
    .schema("hrms")
    .from("onboarding_portal_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("case_id", account.case_id);

  return account.case_id;
}

export async function verifyPortalOtp(email: string, otp: string): Promise<string | null> {
  const admin = createAdminClient();
  const account = await findPortalAccountByEmail(email);

  if (!account || !account.is_active || !account.otp_hash || !account.otp_expires_at) {
    return null;
  }
  if (new Date(account.otp_expires_at) < new Date()) return null;

  const otpHash = hashOtp(otp);
  const storedHash = Buffer.from(account.otp_hash, "hex");
  const computedHash = Buffer.from(otpHash, "hex");
  if (storedHash.length !== computedHash.length || !timingSafeEqual(storedHash, computedHash)) {
    return null;
  }

  await admin
    .schema("hrms")
    .from("onboarding_portal_accounts")
    .update({
      otp_hash: null,
      otp_expires_at: null,
      last_login_at: new Date().toISOString(),
    })
    .eq("case_id", account.case_id);

  return account.case_id;
}

export async function addTimelineEvent(
  _supabase: AuthSupabaseClient,
  caseId: string,
  event: {
    eventType: string;
    title: string;
    description?: string;
    actorUserId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const admin = createAdminClient();
  const { error } = await admin.schema("hrms").from("onboarding_timeline_events").insert({
    case_id: caseId,
    event_type: event.eventType,
    title: event.title,
    description: event.description ?? null,
    actor_user_id: event.actorUserId ?? null,
    metadata: event.metadata ?? {},
  });
  if (error) throw new Error(error.message);
}
