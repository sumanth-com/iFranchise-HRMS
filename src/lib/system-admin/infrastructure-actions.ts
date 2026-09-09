"use server";

import { siteConfig } from "@/config/site";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";
import type {
  InfrastructureTabId,
  InfrastructureTabResult,
} from "@/lib/system-admin/infrastructure-types";
import { getApiManagementSnapshot } from "@/lib/system-admin/services/api-management-queries";
import { getBackupOperationsSnapshot } from "@/lib/system-admin/services/backup-service";
import { getDatabaseHealthDetail } from "@/lib/system-admin/services/database-health-service";
import { getEmailServiceSnapshot } from "@/lib/system-admin/services/email-service";
import { listStorageBuckets } from "@/lib/system-admin/services/storage-service";
import { createClient } from "@/lib/supabase/server";

export async function loadInfrastructureTabAction(
  tab: InfrastructureTabId,
): Promise<InfrastructureTabResult> {
  try {
    const profile = await requireSuperAdminProfile();
    const supabase = await createClient();
    const orgId = profile.employee.organizationId;

    switch (tab) {
      case "email": {
        const data = await getEmailServiceSnapshot(supabase, orgId);
        return { success: true, tab, data };
      }
      case "storage": {
        const data = await listStorageBuckets(orgId);
        return { success: true, tab, data, organizationId: orgId };
      }
      case "api": {
        const data = await getApiManagementSnapshot(supabase, orgId);
        return { success: true, tab, data, origin: siteConfig.url };
      }
      case "backup": {
        const data = await getBackupOperationsSnapshot(supabase, orgId);
        return { success: true, tab, data };
      }
      case "database": {
        const data = await getDatabaseHealthDetail(supabase, orgId);
        return { success: true, tab, data };
      }
      default:
        return { success: false, message: "Unknown infrastructure section" };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to load section",
    };
  }
}
