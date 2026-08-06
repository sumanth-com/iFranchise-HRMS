import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { DocumentsHubSection } from "@/lib/dashboard/self-service/documents-hub-section";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function DocumentsTeamPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentsHubSection section="team" searchParams={searchParams} />
    </Suspense>
  );
}
