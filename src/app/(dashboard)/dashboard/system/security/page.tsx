import { SecurityCenterView } from "@/components/system-admin/security-center-view";
import { AUDIT_VIEW_PERMISSIONS } from "@/lib/audit/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { getSecurityCenterData } from "@/lib/system-admin/services/security-center-service";
import { createClient } from "@/lib/supabase/server";

export default async function SuperAdminSecurityPage() {
  await requireSuperAdminProfile();
  const profile = await requireServerAnyPermission([...AUDIT_VIEW_PERMISSIONS]);
  const supabase = await createClient();
  const data = await getSecurityCenterData(supabase, profile);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SecurityCenterView data={data} />
    </div>
  );
}
