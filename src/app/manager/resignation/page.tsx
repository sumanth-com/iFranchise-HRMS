import { ManagerResignationsView } from "@/components/manager/resignation/manager-resignations-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { listResignations } from "@/lib/exit/services/exit-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function ManagerResignationPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.manager,
    "exit.view",
    "exit.approve",
  ]);
  const supabase = await createClient();
  const result = await listResignations(supabase, profile, {
    page: 1,
    pageSize: 50,
    exitStatus: "submitted",
  });

  const pending = result.data.filter(
    (row) =>
      row.employeeId !== profile.employee.id &&
      row.managerEmployeeId === profile.employee.id,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <ManagerResignationsView pending={pending} />
    </div>
  );
}
