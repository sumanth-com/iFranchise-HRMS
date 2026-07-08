import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmployeeDocumentsManagement } from "@/components/documents/employee-documents-management";
import { createClient } from "@/lib/supabase/server";
import { isEmployeeScoped } from "@/lib/documents/services/documents-utils";
import {
  getDocumentsLookups,
  listEmployeeDocuments,
} from "@/lib/documents/services/document-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { documentListParamsSchema } from "@/lib/validations/documents";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EmployeeDocumentsPage({ searchParams }: Props) {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = documentListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    employeeId: typeof raw.employeeId === "string" ? raw.employeeId : undefined,
    departmentId: typeof raw.departmentId === "string" ? raw.departmentId : undefined,
    documentTypeId:
      typeof raw.documentTypeId === "string" ? raw.documentTypeId : undefined,
    documentStatus:
      typeof raw.documentStatus === "string" ? raw.documentStatus : undefined,
  });

  const [result, lookups] = await Promise.all([
    listEmployeeDocuments(supabase, profile, params),
    getDocumentsLookups(supabase, profile),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EmployeeDocumentsManagement
        result={result}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
        selfOnly={isEmployeeScoped(profile)}
      />
    </Suspense>
  );
}
