import { type ReactNode } from "react";

import { EmployeeAnnouncementGate } from "@/components/employee/announcements/employee-announcement-gate";
import { PortalShellLayout } from "@/components/layout/portalshell-layout";
import { getCurrentUserProfile } from "@/lib/auth/profile-loader";
import { loadEmployeeAnnouncementsForRequest } from "@/lib/organization/services/employee-announcement-request";
import { selectPendingMandatoryAnnouncements } from "@/lib/organization/services/company-announcement-queries";

type EmployeeLayoutProps = {
  children: ReactNode;
};

export default async function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const profile = await getCurrentUserProfile();
  const announcements = profile
    ? await loadEmployeeAnnouncementsForRequest(
        profile.employee.organizationId,
        profile.employee.id,
      ).catch((error) => {
        console.error("[employee-announcement-gate] load failed", error);
        return [];
      })
    : [];

  return (
    <PortalShellLayout portalVariant="employee">
      <EmployeeAnnouncementGate
        initialAnnouncements={selectPendingMandatoryAnnouncements(announcements)}
      />
      {children}
    </PortalShellLayout>
  );
}
