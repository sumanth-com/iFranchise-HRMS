"use client";

import { type ReactNode } from "react";

import { ModuleShell } from "@/components/common/sticky-layout";
import { PerformanceSubNav } from "@/components/performance/performance-sub-nav";

export function PerformanceShell({ children }: { children: ReactNode }) {
  return <ModuleShell header={<PerformanceSubNav />}>{children}</ModuleShell>;
}
