import { type ReactNode } from "react";

import { PortalShellLayout } from "@/components/layout/portalshell-layout";

type EmployeeLayoutProps = {
  children: ReactNode;
};

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  return <PortalShellLayout portalVariant="employee">{children}</PortalShellLayout>;
}
