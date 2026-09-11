import { EmployeeAnnouncementsView } from "@/components/employee/announcements/employee-announcements-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { safeServerCall } from "@/lib/errors/safe-server";
import { listEmployeeAnnouncements } from "@/lib/organization/services/company-announcement-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

/** HR Self-Service announcements feed (not Organization → Announcements admin). */
export default async function HrSelfServiceAnnouncementsPage() {
  const profile = await requireServerAnyPermission([PORTAL_PERMISSIONS.hr]);
  const supabase = await createClient();
  const announcements = await safeServerCall(
    () =>
      listEmployeeAnnouncements(
        supabase,
        profile.employee.organizationId,
        profile.employee.id,
      ),
    [],
    "[dashboard/announcements] list failed",
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <EmployeeAnnouncementsView announcements={announcements} />
    </div>
  );
}
