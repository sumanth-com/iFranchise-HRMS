"use client";

import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/common/button";
import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav";
import { UserProfileDropdown } from "@/components/layout/user-profile-dropdown";
import { useSidebar } from "@/hooks/use-sidebar";

export function TopNav() {
  const { toggleCollapsed, isCollapsed, setMobileOpen } = useSidebar();

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
        <BreadcrumbNav />
      </div>
      <UserProfileDropdown />
    </header>
  );
}
