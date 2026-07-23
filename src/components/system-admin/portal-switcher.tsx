"use client";

import { ChevronDown, LayoutGrid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/common/button";
import { PORTAL_SWITCH_LINKS } from "@/lib/system-admin/constants";
import { hasPermission } from "@/lib/permissions/utils";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const PORTAL_PERMISSION_MAP: Record<string, string> = {
  hr: "portal.hr.access",
  ceo: "portal.ceo.access",
  manager: "portal.manager.access",
  employee: "portal.employee.access",
};

export function PortalSwitcher() {
  const { permissionCodes, roles } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isSuperAdmin = roles.some((role) => role.code === "super_admin");
  if (!isSuperAdmin) return null;

  const availablePortals = PORTAL_SWITCH_LINKS.filter((portal) =>
    hasPermission(permissionCodes, PORTAL_PERMISSION_MAP[portal.portal]),
  );

  const activePortal =
    availablePortals.find(
      (portal) => pathname === portal.href || pathname.startsWith(`${portal.href}/`),
    ) ?? availablePortals[0];

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <LayoutGrid className="size-4" />
        <span className="hidden sm:inline">{activePortal?.label ?? "Portals"}</span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </Button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close portal menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border bg-popover p-1 shadow-lg">
            {availablePortals.map((portal) => (
              <Link
                key={portal.portal}
                href={portal.href}
                prefetch
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                  pathname === portal.href || pathname.startsWith(`${portal.href}/`)
                    ? "bg-accent font-medium"
                    : "",
                )}
              >
                {portal.label}
              </Link>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
