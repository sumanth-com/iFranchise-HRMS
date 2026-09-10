"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/common/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPortalSwitcherStateAction } from "@/lib/system-admin/portal-switcher-actions";
import {
  filterPortalSwitchLinks,
  type PortalSwitchLink,
} from "@/lib/system-admin/portal-switch";
import { resolveActivePortalSwitchLink } from "@/lib/system-admin/constants";
import { useActivePortal } from "@/providers/active-portal-provider";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

/** Client-only portal switcher — loaded without SSR to avoid hydration mismatches. */
export function PortalSwitcher() {
  const router = useRouter();
  const { permissionCodes } = useAuth();
  const { activePortal, setActivePortal } = useActivePortal();
  const pathname = usePathname();
  const refreshingRef = useRef(false);

  // Seed from AuthProvider, then replace with live RPC (cookie-bypass) state.
  const [availablePortals, setAvailablePortals] = useState<PortalSwitchLink[]>(
    () => filterPortalSwitchLinks(permissionCodes),
  );

  const syncFromServer = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const result = await getPortalSwitcherStateAction();
      if (result.success) {
        setAvailablePortals(result.portals);
      }
    } finally {
      refreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    setAvailablePortals(filterPortalSwitchLinks(permissionCodes));
  }, [permissionCodes]);

  // Always resolve from DB on mount so stale permission cookies cannot hide portals.
  useEffect(() => {
    void syncFromServer();
  }, [syncFromServer]);

  // Hide completely when there is nothing to switch between.
  if (availablePortals.length <= 1) {
    return null;
  }

  const activePortalLink = resolveActivePortalSwitchLink(
    pathname,
    availablePortals,
    activePortal,
  );
  const label = activePortalLink?.label ?? "Portals";

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) void syncFromServer();
      }}
    >
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
