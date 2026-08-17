import "server-only";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import {
  WEBHOOK_EVENTS,
  type WebhookEvent,
} from "@/lib/public-api/constants";
import {
  decryptSecret,
  generateWebhookSecret,
  signWebhookPayload,
} from "@/lib/public-api/crypto";
import { createAdminClient } from "@/lib/supabase/admin";

import type { SystemWebhookRow, WebhookDeliveryRow } from "@/lib/public-api/webhook-types";

function parseEvents(value: unknown): WebhookEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is WebhookEvent =>
    WEBHOOK_EVENTS.includes(item as WebhookEvent),
  );
}

function mapWebhook(row: Record<string, unknown>): SystemWebhookRow {
  return {
    id: row.id as string,
    name: row.name as string,
    endpointUrl: row.endpoint_url as string,
    events: parseEvents(row.events),
    secretPrefix: row.secret_prefix as string,
    isActive: Boolean(row.is_active),
    lastDeliveryAt: (row.last_delivery_at as string | null) ?? null,
    lastDeliveryStatus: (row.last_delivery_status as string | null) ?? null,
    failureCount: Number(row.failure_count ?? 0),
    createdAt: row.created_at as string,
  };
}

export async function listSystemWebhooks(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<SystemWebhookRow[]> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_webhooks")
    .select(
      "id, name, endpoint_url, events, secret_prefix, is_active, last_delivery_at, last_delivery_status, failure_count, created_at",
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapWebhook(row as Record<string, unknown>));
}

export async function listWebhookDeliveries(
  supabase: AuthSupabaseClient,
  organizationId: string,
  webhookId?: string,
): Promise<WebhookDeliveryRow[]> {
  let query = supabase
    .schema("hrms")
    .from("system_webhook_deliveries")
    .select(
      "id, webhook_id, event_type, request_id, delivery_status, response_status, error_message, attempt_count, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (webhookId) query = query.eq("webhook_id", webhookId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    webhookId: row.webhook_id as string,
    eventType: row.event_type as string,
    requestId: row.request_id as string,
    deliveryStatus: row.delivery_status as string,
    responseStatus: row.response_status != null ? Number(row.response_status) : null,
    errorMessage: (row.error_message as string | null) ?? null,
    attemptCount: Number(row.attempt_count ?? 1),
    createdAt: row.created_at as string,
  }));
}

export async function createSystemWebhook(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: { name: string; endpointUrl: string; events: WebhookEvent[] },
): Promise<{ id: string; rawSecret: string; prefix: string }> {
  const events = parseEvents(input.events);
  if (events.length === 0) throw new Error("Select at least one event");

  const url = input.endpointUrl.trim();
  const generated = generateWebhookSecret();

  const { data, error } = await supabase
    .schema("hrms")
    .from("system_webhooks")
    .insert({
      organization_id: profile.employee.organizationId,
      name: input.name.trim(),
      endpoint_url: url,
      events,
      secret_prefix: generated.prefix,
      secret_hash: generated.hash,
      secret_encrypted: generated.encrypted,
      is_active: true,
      created_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create webhook");
  return { id: data.id as string, rawSecret: generated.rawSecret, prefix: generated.prefix };
}

export async function updateSystemWebhook(
  supabase: AuthSupabaseClient,
  organizationId: string,
  webhookId: string,
  patch: { name?: string; endpointUrl?: string; events?: WebhookEvent[]; isActive?: boolean },
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) payload.name = patch.name.trim();
  if (patch.endpointUrl !== undefined) payload.endpoint_url = patch.endpointUrl.trim();
  if (patch.events !== undefined) payload.events = parseEvents(patch.events);
  if (patch.isActive !== undefined) payload.is_active = patch.isActive;

  const { error } = await supabase
    .schema("hrms")
    .from("system_webhooks")
    .update(payload)
    .eq("id", webhookId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function deleteSystemWebhook(
  supabase: AuthSupabaseClient,
  organizationId: string,
  webhookId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .schema("hrms")
    .from("system_webhooks")
    .update({ deleted_at: now, is_active: false, updated_at: now })
    .eq("id", webhookId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

async function deliverOnce(input: {
  webhookId: string;
  organizationId: string;
  endpointUrl: string;
  encryptedSecret: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  requestId: string;
}): Promise<{ status: number | null; error: string | null }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    id: input.requestId,
    type: input.event,
    createdAt: new Date().toISOString(),
    data: input.payload,
  });
  const secret = decryptSecret(input.encryptedSecret);
  const signature = signWebhookPayload(secret, timestamp, body);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(input.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-HRMS-Event": input.event,
        "X-HRMS-Delivery": input.requestId,
        "X-HRMS-Signature": `t=${timestamp},v1=${signature}`,
        "X-Request-ID": input.requestId,
        "User-Agent": "iFranchise-HRMS-Webhooks/1.0",
      },
      body,
      signal: controller.signal,
    });
    if (!response.ok) {
      return { status: response.status, error: `HTTP ${response.status}` };
    }
    return { status: response.status, error: null };
  } catch (error) {
    return {
      status: null,
      error: error instanceof Error ? error.message : "Delivery failed",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function dispatchWebhookEvent(
  organizationId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .schema("hrms")
    .from("system_settings")
    .select("api_config")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) return;
  const config = (data?.api_config ?? {}) as { webhooksEnabled?: boolean };
  if (config.webhooksEnabled === false) return;

  const { data: hooks, error: hookError } = await admin
    .schema("hrms")
    .from("system_webhooks")
    .select("id, endpoint_url, events, secret_encrypted, is_active")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .is("deleted_at", null);

  if (hookError || !hooks?.length) return;

  const targets = hooks.filter((row) => parseEvents(row.events).includes(event));
  if (targets.length === 0) return;

  for (const hook of targets) {
    const requestId = crypto.randomUUID();
    const result = await deliverOnce({
      webhookId: hook.id as string,
      organizationId,
      endpointUrl: hook.endpoint_url as string,
      encryptedSecret: hook.secret_encrypted as string,
      event,
      payload,
      requestId,
    });

    const success = result.error == null;
    await admin.schema("hrms").from("system_webhook_deliveries").insert({
      organization_id: organizationId,
      webhook_id: hook.id,
      event_type: event,
      request_id: requestId,
      payload_summary: {
        event,
        keys: Object.keys(payload).slice(0, 12),
      },
      response_status: result.status,
      error_message: result.error,
      attempt_count: 1,
      delivery_status: success ? "success" : "failed",
      completed_at: new Date().toISOString(),
    });

    await admin
      .schema("hrms")
      .from("system_webhooks")
      .update({
        last_delivery_at: new Date().toISOString(),
        last_delivery_status: success ? "success" : "failed",
        failure_count: success ? 0 : Number((hook as { failure_count?: number }).failure_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", hook.id);
  }
}

export async function sendWebhookTest(
  supabase: AuthSupabaseClient,
  organizationId: string,
  webhookId: string,
): Promise<void> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("system_webhooks")
    .select("id, endpoint_url, secret_encrypted, is_active")
    .eq("id", webhookId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Webhook not found");
  if (!data.is_active) throw new Error("Webhook is inactive");

  await dispatchWebhookEvent(organizationId, "employee.updated", {
    test: true,
    webhookId,
  });
}
