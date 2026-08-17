"use client";

import { type ReactNode } from "react";

import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { DashboardUrlCleaner } from "@/components/layout/dashboard-url-cleaner";
import { ActivePortalProvider } from "@/providers/active-portal-provider";
import { BreadcrumbLabelProvider } from "@/providers/breadcrumb-label-provider";
import { ProductTourProvider } from "@/providers/product-tour-provider";
import { SidebarProvider } from "@/hooks/use-sidebar";
import type { UserTourStateMap } from "@/lib/product-tour/types";

type DashboardShellProps = {
  children: ReactNode;
  initialTourState: UserTourStateMap;
};

export function DashboardShell({ children, initialTourState }: DashboardShellProps) {
  return (
    <ActivePortalProvider>
      <BreadcrumbLabelProvider>
        <SidebarProvider>
        <ProductTourProvider initialTourState={initialTourState}>
        <DashboardUrlCleaner />
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <MobileSidebar />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <TopNav />
            {/*
            Overflow is owned by ModuleShell / PageScroll children so
            sticky module headers never fight page content.
          */}
            <main
              data-tour="main-content"
              className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
            >
              <NavigationProgress />
              {children}
            </main>
          </div>
        </div>
        </ProductTourProvider>
        </SidebarProvider>
      </BreadcrumbLabelProvider>
    </ActivePortalProvider>
  );
}
