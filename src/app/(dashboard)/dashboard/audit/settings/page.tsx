import { AuditSettingsForm } from "@/components/audit/audit-settings-form";
import {
  AUDIT_EXPORT_PERMISSIONS,
  AUDIT_VIEW_PERMISSIONS,
  isSuperAdmin,
} from "@/lib/audit/constants";
import { getAuditSettings } from "@/lib/audit/services/audit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function AuditSettingsPage() {
  const profile = await requireServerAnyPermission([
    ...AUDIT_VIEW_PERMISSIONS,
    ...AUDIT_EXPORT_PERMISSIONS,
  ]);
  const supabase = await createClient();
  const settings = await getAuditSettings(supabase, profile.employee.organizationId);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Retention</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how long audit logs are retained before soft archival.
        </p>
      </div>
      <AuditSettingsForm settings={settings} canEdit={isSuperAdmin(profile)} />
    </div>
  );
}
