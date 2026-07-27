import { type ReactNode } from "react";

import { PortalShellLayout } from "@/components/layout/portalshell-layout";

type DashboardGroupLayoutProps = {
  children: ReactNode;
};

export default function DashboardGroupLayout({ children }: DashboardGroupLayoutProps) {
  return <PortalShellLayout>{children}</PortalShellLayout>;
}
