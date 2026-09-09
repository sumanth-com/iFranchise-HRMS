import type { ApiManagementSnapshot } from "@/lib/system-admin/services/api-management-types";
import type { BackupOperationsSnapshot } from "@/lib/system-admin/services/backup-types";
import type { DatabaseHealthSnapshot } from "@/lib/system-admin/services/database-health-service";
import type { EmailServiceSnapshot } from "@/lib/system-admin/services/email-service";
import type { StorageBucketSnapshot } from "@/lib/system-admin/services/storage-types";

export type InfrastructureTabId = "email" | "storage" | "api" | "backup" | "database";

export type InfrastructureTabResult =
  | { success: true; tab: "email"; data: EmailServiceSnapshot }
  | {
      success: true;
      tab: "storage";
      data: StorageBucketSnapshot[];
      organizationId: string;
    }
  | { success: true; tab: "api"; data: ApiManagementSnapshot; origin: string }
  | { success: true; tab: "backup"; data: BackupOperationsSnapshot }
  | { success: true; tab: "database"; data: DatabaseHealthSnapshot }
  | { success: false; message: string };
