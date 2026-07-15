import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoNotificationsView } from "@/components/ceo/notifications/ceo-notifications-view";
import { getCeoNotificationsModuleData } from "@/lib/ceo/actions/ceo-notifications-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";
import { ceoNotificationsListParamsSchema } from "@/lib/validations/ceo-notifications";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoNotificationsPage({ searchParams }: Props) {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const rawParams = await searchParams;

  const parsed = ceoNotificationsListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    category: firstString(rawParams.category),
    priority: firstString(rawParams.priority),
    status: firstString(rawParams.status),
    departmentId: firstString(rawParams.departmentId),
    dateFrom: firstString(rawParams.dateFrom),
    dateTo: firstString(rawParams.dateTo),
    search: firstString(rawParams.search),
  });

  const data = await getCeoNotificationsModuleData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoNotificationsView {...data} initialFilters={parsed} />
    </Suspense>
  );
}
