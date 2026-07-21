import { EmployeeResignationView } from "@/components/employee/resignation/employee-resignation-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { getExitSettings } from "@/lib/exit/services/exit-settings";
import { getEmployeeResignationSnapshot } from "@/lib/exit/services/exit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { hasPermission } from "@/lib/permissions/utils";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeResignationPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "exit.view",
  ]);
  const supabase = await createClient();

  const [{ activeResignation, history }] = await Promise.all([
    getEmployeeResignationSnapshot(supabase, profile),
    getExitSettings(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <EmployeeResignationView
        applyHref={`${EMPLOYEE_ROUTES.resignation}/apply`}
        canApply={hasPermission(profile.permissionCodes, "exit.create")}
        activeResignation={activeResignation}
        history={history}
      />
    </div>
  );
}
