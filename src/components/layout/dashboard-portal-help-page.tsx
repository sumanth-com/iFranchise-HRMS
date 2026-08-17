"use client";

import { PortalHelpView } from "@/components/layout/portal-help-view";
import { useActivePortal } from "@/providers/active-portal-provider";

export function DashboardPortalHelpPage({ firstName }: { firstName: string }) {
  const { activePortal } = useActivePortal();
  const variant = activePortal === "system" ? "system" : "hr";
  return <PortalHelpView firstName={firstName} variant={variant} />;
}
