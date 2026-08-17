"use client";

import { PortalManualCard } from "@/components/layout/portal-manual-card";
import { PORTAL_MANUALS } from "@/lib/help/portal-manuals";

/** Manager-only wrapper kept for existing imports. */
export function ManagerPortalManualCard() {
  return <PortalManualCard {...PORTAL_MANUALS.manager} />;
}
