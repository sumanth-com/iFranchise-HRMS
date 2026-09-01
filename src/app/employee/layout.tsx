import { type ReactNode } from "react";

import { EmployeeAnnouncementGate } from "@/components/employee/announcements/employee-announcement-gate";
import { PortalShellLayout } from "@/components/layout/portalshell-layout";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getCurrentUserProfile } from "@/lib/auth/profile-loader";
import { safeServerCall } from "@/lib/errors/safe-server";
import { listPendingMandatoryAnnouncements } from "@/lib/organization/services/company-announcement-queries";
import { createClient } from "@/lib/supabase/server";

type EmployeeLayoutProps = {
  children: ReactNode;
};

export default async function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const pending = await safeServerCall(
    async () => {
      const profile = await getCurrentUserProfile();
      if (!profile || !profile.permissionCodes.includes(PORTAL_PERMISSIONS.employee)) {
        return [];
      }
      const supabase = await createClient();
      return listPendingMandatoryAnnouncements(
        supabase,
        profile.employee.organizationId,
        profile.employee.id,
      );
    },
    [],
    "[employee/announcements] pending lookup failed",
  );

  return (
    <PortalShellLayout portalVariant="employee">
      <EmployeeAnnouncementGate pending={pending} />
      {children}
    </PortalShellLayout>
  );
}
