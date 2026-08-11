import { Suspense } from "react";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { DocumentsTeamPage } from "@/lib/dashboard/self-service/documents-hub-section";
import { parseTeamDocumentsSection } from "@/lib/documents/constants";

type PageProps = {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DocumentsTeamSectionPage({ params, searchParams }: PageProps) {
  const { section } = await params;
  const teamSection = parseTeamDocumentsSection(section);

  if (!teamSection) {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <DocumentsTeamPage searchParams={searchParams} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <DocumentsTeamPage searchParams={searchParams} teamSection={teamSection} />
    </Suspense>
  );
}
