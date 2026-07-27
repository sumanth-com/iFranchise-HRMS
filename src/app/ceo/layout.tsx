import { type ReactNode } from "react";

import { PortalShellLayout } from "@/components/layout/portalshell-layout";

type CeoLayoutProps = {
  children: ReactNode;
};

export default function CeoLayout({ children }: CeoLayoutProps) {
  return <PortalShellLayout portalVariant="ceo">{children}</PortalShellLayout>;
}
