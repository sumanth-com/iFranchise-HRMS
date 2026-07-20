import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CompanyLettersManagement } from "@/components/documents/company-letters-management";
import { createClient } from "@/lib/supabase/server";
import {
  getDocumentsLookups,
  listLetters,
} from "@/lib/documents/services/document-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { letterListParamsSchema } from "@/lib/validations/documents";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CompanyLettersPage({ searchParams }: Props) {
  const profile = await requireServerPermission("documents.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = letterListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    employeeId: typeof raw.employeeId === "string" ? raw.employeeId : undefined,
    letterType: typeof raw.letterType === "string" ? raw.letterType : undefined,
    letterStatus: typeof raw.letterStatus === "string" ? raw.letterStatus : undefined,
  });

  const [result, lookups] = await Promise.all([
    listLetters(supabase, profile, params),
    getDocumentsLookups(supabase, profile),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CompanyLettersManagement
        result={result}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
      />
    </Suspense>
  );
}
