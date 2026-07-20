import { notFound } from "next/navigation";
import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { EmployeeDocumentDetailView } from "@/components/documents/employee-document-detail-view";
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

export default async function EmployeeDocumentDetailPage({ params }: Props) {
  const { employeeId } = await params;
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();

  const [employeeProfile, lookups] = await Promise.all([
    getEmployeeDocumentProfile(supabase, profile, employeeId),
    getDocumentsLookups(supabase, profile),
  ]);

  if (!employeeProfile) notFound();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EmployeeDocumentDetailView
        profile={employeeProfile}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
        selfOnly={isEmployeeScoped(profile)}
      />
    </Suspense>
  );
}
