import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { CeoPayrollView } from "@/components/ceo/payroll/ceo-payroll-view";
import { getCeoPayrollModuleData } from "@/lib/ceo/actions/ceo-payroll-actions";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";
import { ceoPayrollListParamsSchema } from "@/lib/validations/ceo-payroll";

type CeoPayrollPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

export default async function CeoPayrollPage({ searchParams }: CeoPayrollPageProps) {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  const rawParams = await searchParams;
  const now = new Date();

  const parsed = ceoPayrollListParamsSchema.parse({
    page: firstString(rawParams.page),
    pageSize: firstString(rawParams.pageSize),
    search: firstString(rawParams.search),
    month: firstString(rawParams.month) ?? String(now.getMonth() + 1),
    year: firstString(rawParams.year) ?? String(now.getFullYear()),
    departmentId: firstString(rawParams.departmentId),
    employmentTypeId: firstString(rawParams.employmentTypeId),
    payrollStatus: firstString(rawParams.payrollStatus),
  });

  const data = await getCeoPayrollModuleData(parsed);

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <CeoPayrollView {...data} initialFilters={parsed} />
    </Suspense>
  );
}
