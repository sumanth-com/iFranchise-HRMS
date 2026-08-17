import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  expandLegacyPermissions,
  isPublicApiScope,
  type PublicApiScope,
} from "@/lib/public-api/constants";
import { clientIp, extractBearerToken, hashApiSecret } from "@/lib/public-api/crypto";
import { PublicApiError } from "@/lib/public-api/errors";
import { getSystemApiConfig, resolveKeyRateLimit } from "@/lib/public-api/settings";
import { countRecentRequests } from "@/lib/public-api/usage";

export type AuthenticatedApiKey = {
  id: string;
  organizationId: string;
  name: string;
  prefix: string;
  environment: "production" | "sandbox";
  scopes: PublicApiScope[];
  allowedIps: string[];
  rateLimit: number;
};

function ipAllowed(allowed: string[], ip: string | null): boolean {
  if (allowed.length === 0) return true;
  if (!ip) return false;
  return allowed.includes(ip);
}

export async function authenticatePublicApi(
  request: Request,
  requiredScope: PublicApiScope | null,
): Promise<AuthenticatedApiKey> {
  const token = extractBearerToken(request);
  if (!token) throw new PublicApiError("unauthorized");

  const hash = hashApiSecret(token);
  const admin = createAdminClient();

  const { data, error } = await admin
    .schema("hrms")
    .from("system_api_keys")
    .select(
      "id, organization_id, name, key_prefix, environment, permissions, scopes, allowed_ips, rate_limit_tier, rate_limit_per_minute, expires_at, status, deleted_at",
    )
    .eq("key_hash", hash)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) throw new PublicApiError("unauthorized");
  if (data.status !== "active") throw new PublicApiError("unauthorized");
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    throw new PublicApiError("unauthorized");
  }

  const config = await getSystemApiConfig(admin, data.organization_id as string);
  if (!config.enabled) throw new PublicApiError("api_disabled");

  const environment = data.environment === "sandbox" ? "sandbox" : "production";
  if (!config.allowedEnvironments.includes(environment)) {
    throw new PublicApiError("forbidden");
  }

  const ip = clientIp(request);
  const allowedIps = Array.isArray(data.allowed_ips) ? (data.allowed_ips as string[]) : [];
  if (!ipAllowed(allowedIps, ip)) throw new PublicApiError("forbidden");

  const scopes = Array.isArray(data.scopes)
    ? (data.scopes as string[]).filter(isPublicApiScope)
    : [];
  const resolvedScopes =
    scopes.length > 0
      ? scopes
      : expandLegacyPermissions(
          Array.isArray(data.permissions) ? (data.permissions as string[]) : [],
        );

  if (requiredScope && !resolvedScopes.includes(requiredScope)) {
    throw new PublicApiError("forbidden");
  }

  const rateLimit = resolveKeyRateLimit(
    String(data.rate_limit_tier ?? "standard"),
    data.rate_limit_per_minute != null ? Number(data.rate_limit_per_minute) : null,
    config.defaultRateLimitPerMinute,
  );

  const recent = await countRecentRequests(admin, data.id as string, 60_000);
  if (recent >= rateLimit) throw new PublicApiError("rate_limited");

  return {
    id: data.id as string,
    organizationId: data.organization_id as string,
    name: data.name as string,
    prefix: data.key_prefix as string,
    environment,
    scopes: resolvedScopes,
    allowedIps,
    rateLimit,
  };
}
