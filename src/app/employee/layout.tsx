import { type ReactNode } from "react";

import { EmployeeAnnouncementGate } from "@/components/employee/announcements/employee-announcement-gate";
import { PortalShellLayout } from "@/components/layout/portalshell-layout";

type EmployeeLayoutProps = {
  children: ReactNode;
};

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  return (
    <PortalShellLayout portalVariant="employee">
      <EmployeeAnnouncementGate />
      {children}
    </PortalShellLayout>
  );
}
