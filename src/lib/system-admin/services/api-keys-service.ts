import { createHash, randomBytes } from "node:crypto";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";

export type SystemApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  allowedIps: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  usageCount: number;
  status: string;
  createdAt: string;
};

function hashKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export async function listSystemApiKeys(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemApiKeyRow[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_api_keys")
    .select(
      "id, name, key_prefix, permissions, allowed_ips, expires_at, last_used_at, last_used_ip, usage_count, status, created_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    keyPrefix: row.key_prefix as string,
    permissions: (row.permissions as string[]) ?? [],
    allowedIps: (row.allowed_ips as string[]) ?? [],
    expiresAt: (row.expires_at as string | null) ?? null,
    lastUsedAt: (row.last_used_at as string | null) ?? null,
    lastUsedIp: (row.last_used_ip as string | null) ?? null,
    usageCount: Number(row.usage_count ?? 0),
    status: row.status as string,
    createdAt: row.created_at as string,
  }));
}

export async function createSystemApiKey(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    name: string;
    permissions: string[];
    allowedIps: string[];
    expiresAt: string | null;
  },
): Promise<{ id: string; rawKey: string; prefix: string }> {
  const rawKey = `hrms_${randomBytes(32).toString("base64url")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 14);

  const { data, error } = await supabase
    .schema("hrms")
    .from("system_api_keys")
    .insert({
      organization_id: profile.employee.organizationId,
      name: input.name.trim(),
      key_prefix: keyPrefix,
      key_hash: keyHash,
      permissions: input.permissions,
      allowed_ips: input.allowedIps,
      expires_at: input.expiresAt,
      status: "active",
      created_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create API key");

  return { id: data.id as string, rawKey, prefix: keyPrefix };
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
  const rawKey = `hrms_${randomBytes(32).toString("base64url")}`;
  const keyHash = hashKey(rawKey);
  const keyPrefix = rawKey.slice(0, 14);

  const { error } = await supabase
    .schema("hrms")
    .from("system_api_keys")
    .update({
      key_prefix: keyPrefix,
      key_hash: keyHash,
      usage_count: 0,
      last_used_at: null,
      last_used_ip: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", keyId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return { rawKey, prefix: keyPrefix };
}
