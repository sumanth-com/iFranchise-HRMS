import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { DocumentsTeamPage } from "@/lib/dashboard/self-service/documents-hub-section";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function DocumentsTeamOverviewPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentsTeamPage searchParams={searchParams} />
    </Suspense>
  );
}
