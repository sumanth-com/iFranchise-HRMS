"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname } from "next/navigation";

import {
  AUDIT_ROUTES,
  AUDIT_SUB_NAV,
  canExportAudit,
  isSuperAdmin,
  resolveAuditRoutes,
} from "@/lib/audit/constants";
import { remapSubNavItems } from "@/lib/navigation/remap-sub-nav";
import type { UserProfile } from "@/types/auth";
import { cn } from "@/lib/utils";

type Props = {
  profile: Pick<UserProfile, "permissionCodes" | "roles">;
  /** Portal base for remapped audit links (e.g. `/dashboard/system/audit`). */
  routesBasePath?: string;
  /** When true, hide retention settings — logs remain view/export only. */
  readOnlyLogs?: boolean;
  /** Hide Timeline tab (Super Admin uses Dashboard + Logs only). */
  hideTimeline?: boolean;
};

export function AuditSubNav({
  profile,
  routesBasePath,
  readOnlyLogs = false,
  hideTimeline = false,
}: Props) {
  const pathname = usePathname();
  const routes = resolveAuditRoutes(routesBasePath);
  const canSettings =
    !readOnlyLogs &&
    canExportAudit(profile.permissionCodes) &&
    isSuperAdmin(profile);

  const remapped = remapSubNavItems(
    AUDIT_SUB_NAV.map(({ title, href }) => ({ title, href })),
    AUDIT_ROUTES.dashboard,
    routes.dashboard,
  );

  const items = remapped.filter((item) => {
    if (item.href === routes.settings) return canSettings;
    if (hideTimeline && item.href === routes.timeline) return false;
    return true;
  });

  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center justify-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="Audit sections"
      >
        {items.map((item) => {
          const isActive =
            item.href === routes.dashboard
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
