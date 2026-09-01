import { AnnouncementsManagement } from "@/components/organization/announcements-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import { safeServerCall } from "@/lib/errors/safe-server";
import { listCompanyAnnouncements } from "@/lib/organization/services/company-announcement-queries";
import { getDepartments, getEmployeeLookups } from "@/lib/organization/services/org-lookups";
import { createClient } from "@/lib/supabase/server";

export default async function CeoOrganizationAnnouncementsPage() {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const orgId = profile.employee.organizationId;
  const [announcements, departments, employees] = await Promise.all([
    safeServerCall(
      () => listCompanyAnnouncements(supabase, orgId),
      [],
      "[ceo/announcements] list failed",
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
