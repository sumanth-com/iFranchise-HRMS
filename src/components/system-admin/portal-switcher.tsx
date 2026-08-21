"use client";

import { ChevronDown, LayoutGrid } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PORTAL_SWITCH_LINKS,
  resolveActivePortalSwitchLink,
  SYSTEM_ADMIN_PERMISSION,
} from "@/lib/system-admin/constants";
import { hasPermission } from "@/lib/permissions/utils";
import { useActivePortal } from "@/providers/active-portal-provider";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

const PORTAL_PERMISSION_MAP: Record<string, string> = {
  system: SYSTEM_ADMIN_PERMISSION,
  hr: "portal.hr.access",
  ceo: "portal.ceo.access",
  manager: "portal.manager.access",
  employee: "portal.employee.access",
};

/** Client-only portal switcher — loaded without SSR to avoid hydration mismatches. */
export function PortalSwitcher() {
  const router = useRouter();
  const { permissionCodes, roles } = useAuth();
  const { activePortal, setActivePortal } = useActivePortal();
  const pathname = usePathname();

  const isSuperAdmin = roles.some((role) => role.code === "super_admin");
  if (!isSuperAdmin) return null;

  const availablePortals = PORTAL_SWITCH_LINKS.filter((portal) =>
    hasPermission(permissionCodes, PORTAL_PERMISSION_MAP[portal.portal]),
  );

  const activePortalLink = resolveActivePortalSwitchLink(
    pathname,
    availablePortals,
    activePortal,
  );
  const label = activePortalLink?.label ?? "Portals";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            aria-haspopup="menu"
          >
            <LayoutGrid className="size-4" />
            <span className="hidden sm:inline">{label}</span>
            <ChevronDown className="size-4 opacity-70" />
          </Button>
        }
      />
      <DropdownMenuContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="z-[100] w-56 rounded-xl p-1"
      >
        {availablePortals.map((portal) => {
          const isActive = activePortalLink?.portal === portal.portal;
          return (
            <DropdownMenuItem
              key={portal.portal}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-2",
                isActive && "bg-accent font-medium",
              )}
              onClick={() => {
                setActivePortal(portal.portal);
                router.push(portal.href);
              }}
            >
              {portal.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PortalSwitcherSkeleton() {
  return <div className="h-8 w-[7.25rem] shrink-0" aria-hidden />;
}
