"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  AUDIT_ROUTES,
  AUDIT_SUB_NAV,
  canExportAudit,
  isSuperAdmin,
} from "@/lib/audit/constants";
import type { UserProfile } from "@/types/auth";
import { cn } from "@/lib/utils";

type Props = {
  profile: Pick<UserProfile, "permissionCodes" | "roles">;
};

export function AuditSubNav({ profile }: Props) {
  const pathname = usePathname();
  const canSettings = canExportAudit(profile.permissionCodes) && isSuperAdmin(profile);

  const items = AUDIT_SUB_NAV.filter((item) => {
    if ("admin" in item && item.admin) return canSettings;
    return true;
  });

  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 shadow-sm">
      {items.map((item) => {
        const isActive =
          item.href === AUDIT_ROUTES.dashboard
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
  );
}
