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
  canSeePortalSwitcher,
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
  const { permissionCodes, profile } = useAuth();
  const { activePortal, setActivePortal } = useActivePortal();
  const pathname = usePathname();
  const refreshingRef = useRef(false);
  const syncedRef = useRef(false);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const allowed =
    canSeePortalSwitcher(profile.email) ||
    canSeePortalSwitcher(profile.employee?.email);

  // Layout permission cookie. Live RPC runs once when the menu is opened.
  const [availablePortals, setAvailablePortals] = useState<PortalSwitchLink[]>(
    () => (allowed ? filterPortalSwitchLinks(permissionCodes) : []),
  );

  const syncFromServer = useCallback(async () => {
    if (!allowed || refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const result = await getPortalSwitcherStateAction();
      if (result.success) {
        setAvailablePortals(result.portals);
      }
    } finally {
      refreshingRef.current = false;
    }
  }, [allowed]);

  const prefetchPortals = useCallback(
    (portals: PortalSwitchLink[]) => {
      for (const portal of portals) {
        if (prefetchedRef.current.has(portal.href)) continue;
        prefetchedRef.current.add(portal.href);
        try {
          router.prefetch(portal.href);
        } catch {
          // Ignore prefetch failures.
        }
      }
    },
    [router],
  );

  useEffect(() => {
    if (!allowed) {
      setAvailablePortals([]);
      return;
    }
    setAvailablePortals(filterPortalSwitchLinks(permissionCodes));
  }, [allowed, permissionCodes]);

  // Visibility: only it@ifranchise.in. Also hide when there is nothing to switch.
  if (!allowed || availablePortals.length <= 1) {
    return null;
  }

  const activePortalLink = resolveActivePortalSwitchLink(
    pathname,
    availablePortals,
    activePortal,
  );
  const label = activePortalLink?.label ?? "Portals";

  // Do not re-sync on every open: that server action can rewrite the permission
  // cookie and force a full layout RSC remount (multi-second navigation stalls).
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) return;
        prefetchPortals(availablePortals);
        if (syncedRef.current) return;
        syncedRef.current = true;
        void syncFromServer();
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
              onMouseEnter={() => {
                if (prefetchedRef.current.has(portal.href)) return;
                prefetchedRef.current.add(portal.href);
                try {
                  router.prefetch(portal.href);
                } catch {
                  // Ignore prefetch failures.
                }
              }}
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
