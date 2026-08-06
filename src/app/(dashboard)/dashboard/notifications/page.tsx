import { Suspense } from "react";
import { redirect } from "next/navigation";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { legacyHubTabRedirectUrl } from "@/lib/dashboard/hub-paths";
import { NotificationsHubSection } from "@/lib/dashboard/self-service/notifications-hub-section";
import { NOTIFICATIONS_ROUTES } from "@/lib/notifications/constants";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NotificationsHubPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const legacy = legacyHubTabRedirectUrl(NOTIFICATIONS_ROUTES.dashboard, raw);
  if (legacy) redirect(legacy);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <NotificationsHubSection section="my" searchParams={searchParams} />
    </Suspense>
  );
}
