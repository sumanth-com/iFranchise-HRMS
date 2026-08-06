import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PageSkeleton } from "@/components/common/page-skeleton";
import { SELF_ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { legacyHubTabRedirectUrl } from "@/lib/dashboard/hub-paths";
import { AttendanceHubSection } from "@/lib/dashboard/self-service/attendance-hub-section";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AttendanceSelfServicePage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(SELF_ATTENDANCE_ROUTES.list, raw);
  if (legacy) redirect(legacy);

  return (
    <Suspense fallback={<PageSkeleton />}>
      <AttendanceHubSection section="my" searchParams={searchParams} />
    </Suspense>
  );
}
