"use client";

import { type ReactNode } from "react";

import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { SidebarProvider } from "@/hooks/use-sidebar";

type DashboardShellProps = {
  children: ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <MobileSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopNav />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
