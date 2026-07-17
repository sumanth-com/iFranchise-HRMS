import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoOrganizationView } from "@/components/ceo/organization/ceo-organization-view";
import { getCeoOrganizationModuleData } from "@/lib/ceo/actions/ceo-organization-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";
import { ceoOrgListParamsSchema } from "@/lib/validations/ceo-organization";

type CeoOrganizationPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoOrganizationPage({
  searchParams,
}: CeoOrganizationPageProps) {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const rawParams = await searchParams;

  const parsed = ceoOrgListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize) ?? "6",
    search: firstString(rawParams.search),
    employeeId: firstString(rawParams.employeeId),
    departmentId: firstString(rawParams.departmentId),
    managerId: firstString(rawParams.managerId),
    employmentStatus: firstString(rawParams.employmentStatus),
    employmentTypeId: firstString(rawParams.employmentTypeId),
    sortBy: firstString(rawParams.sortBy),
    sortOrder: firstString(rawParams.sortOrder),
  });

  const data = await getCeoOrganizationModuleData(parsed);
  const viewEmployeeId = firstString(rawParams.view);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoOrganizationView
        {...data}
        initialFilters={parsed}
        initialEmployeeId={viewEmployeeId}
      />
    </Suspense>
  );
}
