import { SystemIntegrationsHub } from "@/components/system-admin/system-integrations-hub";
import { siteConfig } from "@/config/site";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { getApiManagementSnapshot } from "@/lib/system-admin/services/api-management-queries";
import { listBackupJobs } from "@/lib/system-admin/services/backup-service";
import { getDatabaseHealthDetail } from "@/lib/system-admin/services/database-health-service";
import { getEmailServiceSnapshot } from "@/lib/system-admin/services/email-service";
import { listSystemIntegrations } from "@/lib/system-admin/services/integrations-service";
import { listStorageBuckets } from "@/lib/system-admin/services/storage-service";
import { createClient } from "@/lib/supabase/server";

export default async function SuperAdminIntegrationsPage() {
  const profile = await requireSuperAdminProfile();
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;

  const [email, buckets, integrations, apiManagement, backupJobs, database] =
    await Promise.all([
      getEmailServiceSnapshot(supabase, orgId),
      listStorageBuckets(orgId),
      listSystemIntegrations(supabase, orgId),
      getApiManagementSnapshot(supabase, orgId),
      listBackupJobs(supabase, orgId),
      getDatabaseHealthDetail(supabase, orgId),
    ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <SystemIntegrationsHub
        email={email}
        buckets={buckets}
        organizationId={orgId}
        integrations={integrations}
        apiManagement={apiManagement}
        origin={siteConfig.url}
        backupJobs={backupJobs}
        database={database}
      />
    </div>
  );
}
