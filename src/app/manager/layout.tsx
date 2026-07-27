import { type ReactNode } from "react";

import { PortalShellLayout } from "@/components/layout/portalshell-layout";

type ManagerLayoutProps = {
  children: ReactNode;
};

export default function ManagerLayout({ children }: ManagerLayoutProps) {
  return <PortalShellLayout portalVariant="manager">{children}</PortalShellLayout>;
}
