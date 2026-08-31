import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { DocumentsSubNav } from "@/components/documents/documents-sub-nav";
import { EmployeeDocumentDetailView } from "@/components/documents/employee-document-detail-view";
import { resolveEmployeeFromRouteRef } from "@/lib/employees/services/employee-route-resolver";
import { createClient } from "@/lib/supabase/server";
import { isEmployeeScoped } from "@/lib/documents/services/documents-utils";
import {
  getDocumentsLookups,
  getEmployeeDocumentProfile,
} from "@/lib/documents/services/document-queries";
import { requireServerPermission } from "@/lib/permissions/server";

type Props = {
  params: Promise<{ employeeId: string }>;
};

export default async function TeamEmployeeDocumentDetailPage({ params }: Props) {
  const { employeeId: employeeRouteRef } = await params;
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();

  const resolved = await resolveEmployeeFromRouteRef(
    supabase,
    profile.employee.organizationId,
    employeeRouteRef,
  );
  if (!resolved) {
    notFound();
  }

  const [employeeProfile, lookups] = await Promise.all([
    getEmployeeDocumentProfile(supabase, profile, resolved.id),
    getDocumentsLookups(supabase, profile),
  ]);

  if (!employeeProfile) notFound();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-5">
      <DocumentsSubNav />
      <Suspense fallback={<LoadingSpinner />}>
        <EmployeeDocumentDetailView
          profile={employeeProfile}
          lookups={lookups}
          permissionCodes={profile.permissionCodes}
          selfOnly={isEmployeeScoped(profile)}
        />
      </Suspense>
    </div>
  );
}
