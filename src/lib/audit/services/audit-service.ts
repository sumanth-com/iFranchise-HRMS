import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { ApplicationAuditInput } from "@/lib/audit/services/audit-utils";

export async function writeApplicationAudit(
  supabase: AuthSupabaseClient,
  input: ApplicationAuditInput,
): Promise<string | null> {
  const { data, error } = await supabase.schema("hrms").rpc("write_application_audit", {
    p_organization_id: input.organizationId,
    p_module: input.module,
    p_action: input.action,
    p_description: input.description,
    p_record_id: input.recordId ?? "system",
    p_event_status: input.eventStatus ?? "success",
    p_priority: input.priority ?? "medium",
    p_ip_address: input.ipAddress ?? null,
    p_user_agent: input.userAgent ?? null,
    p_device_type: input.deviceType ?? null,
    p_browser: input.browser ?? null,
    p_operating_system: input.operatingSystem ?? null,
    p_reason: input.reason ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("Failed to write application audit:", error.message);
    return null;
  }

  return typeof data === "string" ? data : null;
}
