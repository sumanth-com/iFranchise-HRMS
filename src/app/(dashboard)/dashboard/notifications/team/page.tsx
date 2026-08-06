import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { NotificationsHubSection } from "@/lib/dashboard/self-service/notifications-hub-section";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default function NotificationsTeamPage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <NotificationsHubSection section="team" searchParams={searchParams} />
    </Suspense>
  );
}
