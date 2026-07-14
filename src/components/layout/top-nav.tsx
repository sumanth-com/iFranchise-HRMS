"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/common/button";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserProfileDropdown } from "@/components/layout/user-profile-dropdown";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/providers/auth-provider";

export function TopNav() {
  const pathname = usePathname();
  const { toggleCollapsed, isCollapsed, setMobileOpen } = useSidebar();
  const { portalHome } = useAuth();
  const isPortalHome = pathname === portalHome;

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b bg-background px-4">
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
            <BreadcrumbNav />
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 pl-1">
        <NotificationBell />
        <UserProfileDropdown />
      </div>
    </header>
  );
}
