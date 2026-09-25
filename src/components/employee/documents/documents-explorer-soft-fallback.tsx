"use client";

import { DocumentsExplorer } from "@/components/employee/documents/documents-explorer";
import { EMPLOYEE_DOCUMENTS_MODULE_ID } from "@/lib/employee/documents/documents-module-cache";
import { peekAuthScopedModuleCache } from "@/lib/perf/use-module-soft-data";
import { useAuth } from "@/providers/auth-provider";
import type { EmployeeDocumentsExplorerData } from "@/types/employee-documents-explorer";

/**
 * Soft-nav Suspense fallback: paint the last valid Documents explorer
 * immediately while the RSC refetch resolves in the background.
 */
export function DocumentsExplorerSoftFallback() {
  const { profile } = useAuth();
  const cached = peekAuthScopedModuleCache<EmployeeDocumentsExplorerData>(
    EMPLOYEE_DOCUMENTS_MODULE_ID,
    {
      organizationId: profile.employee.organizationId,
      employeeId: profile.employee.id,
    },
  );

  if (cached) {
    return <DocumentsExplorer data={cached} />;
  }

  return (
    <div
      className="flex min-h-[12rem] items-center justify-center rounded-2xl border border-dashed bg-muted/20 text-sm text-muted-foreground"
      aria-busy
    >
      Loading documents…
    </div>
  );
}
