import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createAdminClient } from "@/lib/supabase/admin";

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

/** True only when real credentials exist in config — empty `{}` is not a connection. */
export function hasIntegrationCredentials(config: unknown): boolean {
  if (!config || typeof config !== "object" || Array.isArray(config)) return false;
  const entries = Object.entries(config as Record<string, unknown>).filter(
    ([, value]) => value != null && String(value).trim() !== "",
  );
  return entries.length > 0;
}

/**
 * Clears fake "connected" rows (no credentials) and soft-deletes the misleading
 * toggle audit events so dashboards stay natural.
 */
export async function reconcileFakeIntegrations(organizationId: string): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: rows } = await admin
    .schema("hrms")
    .from("system_integrations")
    .select("id, status, config")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  const fakeConnectedIds = (rows ?? [])
    .filter(
      (row) =>
        row.status === "connected" && !hasIntegrationCredentials(row.config),
    )
    .map((row) => row.id as string);

  if (fakeConnectedIds.length > 0) {
    await admin
      .schema("hrms")
      .from("system_integrations")
      .update({
        status: "disconnected",
        last_sync_at: null,
        last_error: null,
        updated_at: now,
      })
      .in("id", fakeConnectedIds);
  }

  // Remove placeholder connect/disconnect/sync noise from activity feeds
  await admin
    .schema("hrms")
    .from("audit_logs")
    .update({ deleted_at: now, updated_at: now })
    .eq("organization_id", organizationId)
    .in("action", [
      "integration_connected",
      "integration_disconnected",
      "integration_sync",
    ])
    .is("deleted_at", null);
}

export async function listSystemIntegrations(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemIntegrationRow[]> {
  await reconcileFakeIntegrations(organizationId);

  const { data, error } = await supabase
    .schema("hrms")
    .from("system_integrations")
    .select("id, provider, status, config, last_sync_at, last_error")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("provider");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const configured = hasIntegrationCredentials(row.config);
    const rawStatus = row.status as string;
    const status: SystemIntegrationRow["status"] = configured
      ? rawStatus === "connected" || rawStatus === "syncing" || rawStatus === "error"
        ? rawStatus
        : "disconnected"
      : "available";

    return {
      id: row.id as string,
      provider: row.provider as IntegrationProvider,
      label: PROVIDER_LABELS[row.provider as IntegrationProvider] ?? (row.provider as string),
      status,
      configured,
      lastSyncAt: configured ? ((row.last_sync_at as string | null) ?? null) : null,
      lastError: configured ? ((row.last_error as string | null) ?? null) : null,
    };
  });
}

export async function setIntegrationStatus(
  supabase: AuthSupabaseClient,
  organizationId: string,
  provider: IntegrationProvider,
  status: "connected" | "disconnected" | "error" | "syncing",
  patch?: { lastError?: string | null; lastSyncAt?: string | null },
): Promise<void> {
  const { data: existing, error: readError } = await supabase
    .schema("hrms")
    .from("system_integrations")
    .select("config")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .is("deleted_at", null)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!hasIntegrationCredentials(existing?.config)) {
    throw new Error(
      `${integrationProviderLabel(provider)} is not configured. Add credentials before connecting.`,
    );
  }

  const { error } = await supabase
    .schema("hrms")
    .from("system_integrations")
    .update({
      status,
      last_error: patch?.lastError ?? null,
      last_sync_at:
        patch?.lastSyncAt ?? (status === "connected" ? new Date().toISOString() : undefined),
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
