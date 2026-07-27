import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

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
  status: string;
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

export async function listSystemIntegrations(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemIntegrationRow[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_integrations")
    .select("id, provider, status, last_sync_at, last_error")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("provider");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    provider: row.provider as IntegrationProvider,
    label: PROVIDER_LABELS[row.provider as IntegrationProvider] ?? row.provider as string,
    status: row.status as string,
    lastSyncAt: (row.last_sync_at as string | null) ?? null,
    lastError: (row.last_error as string | null) ?? null,
  }));
}

export async function setIntegrationStatus(
  supabase: AuthSupabaseClient,
  organizationId: string,
  provider: IntegrationProvider,
  status: "connected" | "disconnected" | "error" | "syncing",
  patch?: { lastError?: string | null; lastSyncAt?: string | null },
): Promise<void> {
  const { error } = await supabase
    .schema("hrms")
    .from("system_integrations")
    .update({
      status,
      last_error: patch?.lastError ?? null,
      last_sync_at: patch?.lastSyncAt ?? (status === "connected" ? new Date().toISOString() : undefined),
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function syncIntegration(
  supabase: AuthSupabaseClient,
  organizationId: string,
  provider: IntegrationProvider,
): Promise<void> {
  await setIntegrationStatus(supabase, organizationId, provider, "syncing");
  await setIntegrationStatus(supabase, organizationId, provider, "connected", {
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  });
}
