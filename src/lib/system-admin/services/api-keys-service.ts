import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import {
  expandLegacyPermissions,
  isPublicApiScope,
  type ApiRateLimitTier,
  type PublicApiScope,
} from "@/lib/public-api/constants";
import { generateApiKey } from "@/lib/public-api/crypto";

export type SystemApiKeyRow = {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  environment: "production" | "sandbox";
  permissions: string[];
  scopes: PublicApiScope[];
  allowedIps: string[];
  rateLimitTier: ApiRateLimitTier;
  rateLimitPerMinute: number | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  usageCount: number;
  status: "active" | "revoked" | "expired";
  createdAt: string;
  createdBy: string | null;
};

function resolveStatus(
  status: string,
  expiresAt: string | null,
): SystemApiKeyRow["status"] {
  if (status === "revoked") return "revoked";
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return "expired";
  return "active";
}

function parseScopes(scopes: unknown, permissions: unknown): PublicApiScope[] {
  const fromScopes = Array.isArray(scopes)
    ? scopes.filter((item): item is PublicApiScope => typeof item === "string" && isPublicApiScope(item))
    : [];
  if (fromScopes.length > 0) return [...new Set(fromScopes)];
  const legacy = Array.isArray(permissions)
    ? permissions.filter((item): item is string => typeof item === "string")
    : [];
  return expandLegacyPermissions(legacy);
}

function mapRow(row: Record<string, unknown>): SystemApiKeyRow {
  const permissions = Array.isArray(row.permissions)
    ? (row.permissions as string[])
    : [];
  const expiresAt = (row.expires_at as string | null) ?? null;
  const status = resolveStatus(String(row.status ?? "active"), expiresAt);

  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    keyPrefix: row.key_prefix as string,
    environment:
      row.environment === "sandbox" ? "sandbox" : "production",
    permissions,
    scopes: parseScopes(row.scopes, row.permissions),
    allowedIps: Array.isArray(row.allowed_ips) ? (row.allowed_ips as string[]) : [],
    rateLimitTier:
      row.rate_limit_tier === "high_volume" || row.rate_limit_tier === "custom"
        ? row.rate_limit_tier
        : "standard",
    rateLimitPerMinute:
      row.rate_limit_per_minute != null ? Number(row.rate_limit_per_minute) : null,
    expiresAt,
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    lastUsedIp: (row.last_used_ip as string | null) ?? null,
    usageCount: Number(row.usage_count ?? 0),
    status,
    createdAt: row.created_at as string,
    createdBy: (row.created_by as string | null) ?? null,
  };
}

const KEY_SELECT =
  "id, name, description, key_prefix, environment, permissions, scopes, allowed_ips, rate_limit_tier, rate_limit_per_minute, expires_at, last_used_at, last_used_ip, usage_count, status, created_at, created_by";

export async function listSystemApiKeys(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemApiKeyRow[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_api_keys")
    .select(KEY_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function getSystemApiKey(
  supabase: AuthSupabaseClient,
  organizationId: string,
  keyId: string,
): Promise<SystemApiKeyRow | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_api_keys")
    .select(KEY_SELECT)
    .eq("organization_id", organizationId)
    .eq("id", keyId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as Record<string, unknown>) : null;
}

export type CreateSystemApiKeyInput = {
  name: string;
  description?: string | null;
  environment: "production" | "sandbox";
  scopes: PublicApiScope[];
  allowedIps: string[];
  expiresAt: string | null;
  rateLimitTier: ApiRateLimitTier;
  rateLimitPerMinute?: number | null;
};

export async function createSystemApiKey(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: CreateSystemApiKeyInput,
): Promise<{ id: string; rawKey: string; prefix: string }> {
  const generated = generateApiKey();
  const scopes = [...new Set(input.scopes.filter(isPublicApiScope))];
  if (scopes.length === 0) {
    throw new Error("Select at least one API scope");
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("system_api_keys")
    .insert({
      organization_id: profile.employee.organizationId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      environment: input.environment,
      key_prefix: generated.prefix,
      key_hash: generated.hash,
      permissions: scopes,
      scopes,
      allowed_ips: input.allowedIps,
      expires_at: input.expiresAt,
      rate_limit_tier: input.rateLimitTier,
      rate_limit_per_minute:
        input.rateLimitTier === "custom" ? input.rateLimitPerMinute ?? 60 : null,
      status: "active",
      created_by: profile.userId,
      created_by_employee_id: profile.employee.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create API key");

  return { id: data.id as string, rawKey: generated.rawKey, prefix: generated.prefix };
}

export async function revokeSystemApiKey(
  supabase: AuthSupabaseClient,
  organizationId: string,
  keyId: string,
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("system_api_keys")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function deleteSystemApiKey(
  supabase: AuthSupabaseClient,
  organizationId: string,
  keyId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .schema("hrms")
    .from("system_api_keys")
    .update({
      status: "revoked",
      deleted_at: now,
      updated_at: now,
    })
    .eq("id", keyId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function rotateSystemApiKey(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  keyId: string,
): Promise<{ rawKey: string; prefix: string }> {
  const existing = await getSystemApiKey(
    supabase,
    profile.employee.organizationId,
    keyId,
  );
  if (!existing) throw new Error("API key not found");
  if (existing.status === "revoked") {
    throw new Error("Revoked keys cannot be rotated. Create a replacement key instead.");
  }

  const generated = generateApiKey();
  const { error } = await supabase
    .schema("hrms")
    .from("system_api_keys")
    .update({
      key_prefix: generated.prefix,
      key_hash: generated.hash,
      usage_count: 0,
      last_used_at: null,
      last_used_ip: null,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", keyId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return { rawKey: generated.rawKey, prefix: generated.prefix };
}
