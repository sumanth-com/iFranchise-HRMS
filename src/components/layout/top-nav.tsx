"use client";

import dynamic from "next/dynamic";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/common/button";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserProfileDropdown } from "@/components/layout/user-profile-dropdown";
import { PortalSwitcherSkeleton } from "@/components/system-admin/portal-switcher";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/providers/auth-provider";

const PortalSwitcher = dynamic(
  () =>
    import("@/components/system-admin/portal-switcher").then(
      (mod) => mod.PortalSwitcher,
    ),
  {
    ssr: false,
    loading: () => <PortalSwitcherSkeleton />,
  },
);

export function TopNav() {
  const pathname = usePathname();
  const { toggleCollapsed, isCollapsed, setMobileOpen } = useSidebar();
  const { portalHome } = useAuth();
  const isPortalHome = pathname === portalHome;

  return (
    <header className="app-shell-topnav relative z-40 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/50 px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex"
          onClick={toggleCollapsed}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="size-5" />
          ) : (
            <PanelLeftClose className="size-5" />
          )}
        </Button>
        <div className="min-w-0 flex-1 overflow-hidden">
          {isPortalHome ? (
            <p className="truncate text-sm font-semibold tracking-tight">Dashboard</p>
          ) : (
            <Suspense fallback={<p className="truncate text-sm font-semibold tracking-tight">…</p>}>
              <BreadcrumbNav />
            </Suspense>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 pl-1">
        <PortalSwitcher />
        <NotificationBell />
        <UserProfileDropdown />
      </div>
    </header>
  );
}
