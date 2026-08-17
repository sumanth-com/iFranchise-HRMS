import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { listSystemApiKeys } from "@/lib/system-admin/services/api-keys-service";
import { getApiUsageMetrics, listApiUsageLogs } from "@/lib/public-api/usage";
import { getSystemApiConfig } from "@/lib/public-api/settings";
import { listSystemWebhooks, listWebhookDeliveries } from "@/lib/public-api/webhooks";
import type { ApiManagementSnapshot } from "@/lib/system-admin/services/api-management-types";

export type { ApiManagementSnapshot };

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
