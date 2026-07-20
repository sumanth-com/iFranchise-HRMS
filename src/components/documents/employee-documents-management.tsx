"use client";

import { EmptyState } from "@/components/common/empty-state";
import { HrEmployeeDocumentCards } from "@/components/documents/hr-employee-document-cards";
import type { DocumentEmployeeCard } from "@/types/documents";

type Props = {
  employees?: DocumentEmployeeCard[];
};

export function EmployeeDocumentsManagement({ employees = [] }: Props) {
  const list = Array.isArray(employees) ? employees : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Employee Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage uploads, verification, and employee document folders.
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState title="No employees found" description="No active employees are available." />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Click an employee to open their document folders and manage uploads.
          </p>
          <HrEmployeeDocumentCards employees={list} />
        </>
      )}
    </div>
  );
}
