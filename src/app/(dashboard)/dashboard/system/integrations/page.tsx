import { SystemIntegrationsHub } from "@/components/system-admin/system-integrations-hub";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import { listSystemApiKeys } from "@/lib/system-admin/services/api-keys-service";
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

  const [email, buckets, integrations, apiKeys, backupJobs, database] =
    await Promise.all([
      getEmailServiceSnapshot(supabase, orgId),
      listStorageBuckets(orgId),
      listSystemIntegrations(supabase, orgId),
      listSystemApiKeys(supabase, orgId),
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
        apiKeys={apiKeys}
        backupJobs={backupJobs}
        database={database}
      />
    </div>
  );
}
