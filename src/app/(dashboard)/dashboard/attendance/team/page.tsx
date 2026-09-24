import { Suspense } from "react";

import { AttendanceHubSection } from "@/lib/dashboard/self-service/attendance-hub-section";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function AttendanceTeamPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <AttendanceHubSection section="team" searchParams={searchParams} />
    </Suspense>
  );
}
