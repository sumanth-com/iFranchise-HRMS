import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ExpiringDocumentsManagement } from "@/components/documents/expiring-documents-management";
import { createClient } from "@/lib/supabase/server";
import {
  getDocumentsLookups,
  getExpiringSummary,
  listEmployeeDocuments,
} from "@/lib/documents/services/document-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { documentListParamsSchema } from "@/lib/validations/documents";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpiringDocumentsPage({ searchParams }: Props) {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = documentListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize ?? 50,
    expiringWindow:
      typeof raw.expiringWindow === "string" ? raw.expiringWindow : "30",
  });

  const [summary, result, lookups] = await Promise.all([
    getExpiringSummary(supabase, profile),
    listEmployeeDocuments(supabase, profile, params),
    getDocumentsLookups(supabase, profile),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ExpiringDocumentsManagement
        summary={summary}
        result={result}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
      />
    </Suspense>
  );
}
