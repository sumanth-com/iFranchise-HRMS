import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { ManagerTeamMemberProfileView } from "@/components/manager/team/manager-team-member-profile-view";
import { buildEmployeeRouteRef, isEmployeeUuid } from "@/lib/employees/routing";
import { resolveEmployeeFromRouteRef } from "@/lib/employees/services/employee-route-resolver";
import { getManagerTeamPageData } from "@/lib/manager/actions/team-actions";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import {
  assertTeamMember,
  getManagerTeamScope,
} from "@/lib/manager/services/team-queries";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import { teamListParamsSchema } from "@/lib/validations/manager-team";

type ManagerTeamMemberPageProps = {
  params: Promise<{ employeeRef: string }>;
};

export default async function ManagerTeamMemberPage({ params }: ManagerTeamMemberPageProps) {
  const profile = await requireServerPermission("portal.manager.access");
  const { employeeRef } = await params;
  const supabase = await createClient();

  const resolved = await resolveEmployeeFromRouteRef(
    supabase,
    profile.employee.organizationId,
    employeeRef,
  );

  if (!resolved) {
    notFound();
  }

  const { teamIds } = await getManagerTeamScope(supabase, profile);

  try {
    assertTeamMember(teamIds, resolved.id);
  } catch {
    notFound();
  }

  const canonicalRef = buildEmployeeRouteRef(resolved);

  if (employeeRef !== canonicalRef || isEmployeeUuid(employeeRef)) {
    redirect(MANAGER_ROUTES.teamMember(resolved));
  }

  const data = await getManagerTeamPageData(teamListParamsSchema.parse({ page: 1, pageSize: 1 }));

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <ManagerTeamMemberProfileView
        employeeId={resolved.id}
        managerEmployeeId={profile.employee.id}
        teamMemberOptions={data.teamMemberOptions}
        designationOptions={data.designationOptions}
      />
    </Suspense>
  );
}
