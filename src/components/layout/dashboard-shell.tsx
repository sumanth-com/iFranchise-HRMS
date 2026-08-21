"use client";

import { type ReactNode } from "react";

import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { DashboardUrlCleaner } from "@/components/layout/dashboard-url-cleaner";
import { InstantNavPrefetch } from "@/components/layout/instant-nav-prefetch";
import { ActivePortalProvider } from "@/providers/active-portal-provider";
import { BreadcrumbLabelProvider } from "@/providers/breadcrumb-label-provider";
import { SidebarProvider } from "@/hooks/use-sidebar";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <ActivePortalProvider>
      <BreadcrumbLabelProvider>
        <SidebarProvider>
        <DashboardUrlCleaner />
        <InstantNavPrefetch />
        <div className="app-shell-canvas flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <MobileSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TopNav />
            {/*
            Overflow is owned by ModuleShell / PageScroll children so
            sticky module headers never fight page content.
          */}
            <main className="app-shell-main relative flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
              <NavigationProgress />
              {children}
            </main>
          </div>
        </div>
        </SidebarProvider>
      </BreadcrumbLabelProvider>
    </ActivePortalProvider>
  );
}
