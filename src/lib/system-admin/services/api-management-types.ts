import type { SystemApiConfig } from "@/lib/public-api/settings";
import type { ApiUsageLogRow, ApiUsageMetrics } from "@/lib/public-api/usage-types";
import type { SystemWebhookRow, WebhookDeliveryRow } from "@/lib/public-api/webhook-types";
import type { SystemApiKeyRow } from "@/lib/system-admin/services/api-key-types";

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
