"use client";

import { type ReactNode } from "react";

import { ModuleShell } from "@/components/common/sticky-layout";
import { PerformanceSubNav } from "@/components/performance/performance-sub-nav";

export function PerformanceShell({
  children,
  basePath,
}: {
  children: ReactNode;
  basePath?: string;
}) {
  return (
    <ModuleShell header={<PerformanceSubNav basePath={basePath} />}>{children}</ModuleShell>
  );
}
