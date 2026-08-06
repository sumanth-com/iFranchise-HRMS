import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { SELF_DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { legacyHubTabRedirectUrl } from "@/lib/dashboard/hub-paths";
import { DocumentsHubSection } from "@/lib/dashboard/self-service/documents-hub-section";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentsSelfServicePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(SELF_DOCUMENTS_ROUTES.list, raw);
  if (legacy) redirect(legacy);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentsHubSection section="my" searchParams={searchParams} />
    </Suspense>
  );
}
