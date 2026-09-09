/** Client-safe integration types (no server-only imports). */

export type IntegrationProvider =
  | "microsoft365"
  | "google_workspace"
  | "slack"
  | "teams"
  | "zoom"
  | "webhook"
  | "rest_api"
  | "zapier";

export type SystemIntegrationRow = {
  id: string;
  provider: IntegrationProvider;
  label: string;
  status: "available" | "connected" | "disconnected" | "error" | "syncing";
  configured: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
};

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  microsoft365: "Microsoft 365",
  google_workspace: "Google Workspace",
  slack: "Slack",
  teams: "Microsoft Teams",
  zoom: "Zoom",
  webhook: "Webhooks",
  rest_api: "REST API",
  zapier: "Zapier",
};

export function integrationProviderLabel(provider: string): string {
  return PROVIDER_LABELS[provider as IntegrationProvider] ?? provider;
}
