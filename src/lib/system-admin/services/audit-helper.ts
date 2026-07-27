import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { writeApplicationAudit } from "@/lib/audit/services/audit-service";
import { getRequestAuditContext } from "@/lib/audit/services/audit-utils";
import type { UserProfile } from "@/types/auth";

export async function writeSystemAudit(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: {
    action: string;
    description: string;
    recordId?: string;
    priority?: "low" | "medium" | "high" | "critical";
    eventStatus?: "success" | "failed";
    reason?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const ctx = await getRequestAuditContext();
  await writeApplicationAudit(supabase, {
    organizationId: profile.employee.organizationId,
    module: "system",
    action: input.action,
    description: input.description,
    recordId: input.recordId ?? profile.userId,
    priority: input.priority ?? "medium",
    eventStatus: input.eventStatus,
    reason: input.reason,
    metadata: input.metadata,
    ...ctx,
  });
}
