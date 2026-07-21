"use client";

import { type ReactNode } from "react";

import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { DashboardUrlCleaner } from "@/components/layout/dashboard-url-cleaner";
import { SidebarProvider } from "@/hooks/use-sidebar";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider>
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
          <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            <NavigationProgress />
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
