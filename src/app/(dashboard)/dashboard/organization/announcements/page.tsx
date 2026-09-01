import { AnnouncementsManagement } from "@/components/organization/announcements-management";
import { safeServerCall } from "@/lib/errors/safe-server";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { listCompanyAnnouncements } from "@/lib/organization/services/company-announcement-queries";
import { getDepartments, getEmployeeLookups } from "@/lib/organization/services/org-lookups";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationAnnouncementsPage() {
  const profile = await requireServerAnyPermission([
    ...ORGANIZATION_VIEW_PERMISSIONS,
    "company_announcement.manage",
  ]);
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const [announcements, departments, employees] = await Promise.all([
    safeServerCall(
      () => listCompanyAnnouncements(supabase, orgId),
      [],
      "[organization/announcements] list failed",
    ),
    getDepartments(supabase, orgId),
    getEmployeeLookups(supabase, orgId),
  ]);

  return (
    <AnnouncementsManagement
      announcements={announcements}
      departments={departments}
      employees={employees}
      permissionCodes={profile.permissionCodes}
    />
  );
}
