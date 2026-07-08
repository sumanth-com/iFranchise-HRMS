import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ResignationsManagement } from "@/components/exit/resignations-management";
import { getExitSettings } from "@/lib/exit/services/exit-settings";
import {
  getExitLookups,
  listResignations,
} from "@/lib/exit/services/exit-queries";
import { isEmployeeOnly, isHrAdmin } from "@/lib/exit/services/exit-utils";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { exitListParamsSchema } from "@/lib/validations/exit";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExitResignationsPage({ searchParams }: Props) {
  const profile = await requireServerPermission("exit.view");
  const supabase = await createClient();
  const raw = await searchParams;

  const params = exitListParamsSchema.parse({
    page: raw.page,
    pageSize: raw.pageSize,
    search: typeof raw.search === "string" ? raw.search : undefined,
    employeeId: typeof raw.employeeId === "string" ? raw.employeeId : undefined,
    departmentId: typeof raw.departmentId === "string" ? raw.departmentId : undefined,
    exitStatus: typeof raw.exitStatus === "string" ? raw.exitStatus : undefined,
  });

  const [result, lookups, settings] = await Promise.all([
    listResignations(supabase, profile, params),
    getExitLookups(supabase, profile),
    getExitSettings(supabase, profile.employee.organizationId),
  ]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ResignationsManagement
        result={result}
        lookups={lookups}
        permissionCodes={profile.permissionCodes}
        currentEmployeeId={profile.employee.id}
        isSelfOnly={isEmployeeOnly(profile)}
        isHrAdmin={isHrAdmin(profile)}
        defaultNoticePeriodDays={settings.defaultNoticePeriodDays}
      />
    </Suspense>
  );
}
