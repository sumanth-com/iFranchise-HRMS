import { Suspense } from "react";

import { AttendanceHubSection } from "@/lib/dashboard/self-service/attendance-hub-section";
import { ModulePageSkeleton } from "@/components/layout/module-page-skeleton";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function AttendanceTeamPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<ModulePageSkeleton />}>
      <AttendanceHubSection section="team" searchParams={searchParams} />
    </Suspense>
  );
}
