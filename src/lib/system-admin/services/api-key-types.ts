import type { ApiRateLimitTier, PublicApiScope } from "@/lib/public-api/constants";

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
