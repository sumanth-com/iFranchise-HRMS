import { LeaveForm } from "@/components/leave/leave-form";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { getLeaveLookups } from "@/lib/leave/services/leave-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeNewLeavePage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "leave.create",
  ]);
  const supabase = await createClient();
  const lookups = await getLeaveLookups(supabase, profile.employee.organizationId);

  // Employees may only apply for themselves — never expose other employees.
  const self =
    lookups.employees.find((employee) => employee.id === profile.employee.id) ?? {
      id: profile.employee.id,
      label: `${profile.employee.firstName} ${profile.employee.lastName}`.trim(),
      code: profile.employee.employeeCode,
    };
  const scopedLookups = { ...lookups, employees: [self] };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Apply for Leave</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Submit a leave request for approval by your manager and HR.
          </p>
        </div>
        <LeaveForm
          lookups={scopedLookups}
          defaultEmployeeId={profile.employee.id}
          redirectPath={EMPLOYEE_ROUTES.leave}
        />
      </div>
    </div>
  );
}
