import { Suspense } from "react";

import { LeaveHubSection } from "@/lib/dashboard/self-service/leave-hub-section";
import { ModulePageSkeleton } from "@/components/layout/module-page-skeleton";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function LeaveTeamPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<ModulePageSkeleton />}>
      <LeaveHubSection section="team" searchParams={searchParams} />
    </Suspense>
  );
}
