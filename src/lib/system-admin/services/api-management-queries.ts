import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { listSystemApiKeys, type SystemApiKeyRow } from "@/lib/system-admin/services/api-keys-service";
import { getApiUsageMetrics, listApiUsageLogs } from "@/lib/public-api/usage";
import type { ApiUsageLogRow, ApiUsageMetrics } from "@/lib/public-api/usage-types";
import { getSystemApiConfig, type SystemApiConfig } from "@/lib/public-api/settings";
import { listSystemWebhooks, listWebhookDeliveries } from "@/lib/public-api/webhooks";
import type { SystemWebhookRow, WebhookDeliveryRow } from "@/lib/public-api/webhook-types";

export type ApiManagementSnapshot = {
  keys: SystemApiKeyRow[];
  metrics: ApiUsageMetrics;
  recentLogs: ApiUsageLogRow[];
  webhooks: SystemWebhookRow[];
  deliveries: WebhookDeliveryRow[];
  config: SystemApiConfig;
  activeKeys: number;
  revokedKeys: number;
  expiredKeys: number;
};

export async function getApiManagementSnapshot(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<ApiManagementSnapshot> {
  const [keys, metrics, logs, webhooks, deliveries, config] = await Promise.all([
    listSystemApiKeys(supabase, organizationId),
    getApiUsageMetrics(supabase, organizationId),
    listApiUsageLogs(supabase, organizationId, { page: 1, pageSize: 25 }),
    listSystemWebhooks(supabase, organizationId),
    listWebhookDeliveries(supabase, organizationId),
    getSystemApiConfig(supabase, organizationId),
  ]);

  return {
    keys,
    metrics,
    recentLogs: logs.data,
    webhooks,
    deliveries,
    config,
    activeKeys: keys.filter((key) => key.status === "active").length,
    revokedKeys: keys.filter((key) => key.status === "revoked").length,
    expiredKeys: keys.filter((key) => key.status === "expired").length,
  };
}
