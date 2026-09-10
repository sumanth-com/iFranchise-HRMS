import { type ReactNode } from "react";

import { PortalShellLayout } from "@/components/layout/portalshell-layout";

type AccountantLayoutProps = {
  children: ReactNode;
};

export default function AccountantLayout({ children }: AccountantLayoutProps) {
  return <PortalShellLayout portalVariant="accountant">{children}</PortalShellLayout>;
}
