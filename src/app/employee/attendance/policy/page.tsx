import { AttendancePolicyView } from "@/components/attendance/attendance-policy-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { getAttendancePolicyDocument } from "@/lib/attendance/services/attendance-policy-queries";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

function resolveEmployeeGreetingName(
  employee: Awaited<ReturnType<typeof getEmployeeById>>,
): string {
  const preferred = employee?.profile?.preferredName?.trim();
  if (preferred) return preferred;

  const firstName = employee?.firstName?.trim();
  if (firstName) return firstName;

  return "Team Member";
}

export default async function EmployeeAttendancePolicyPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "attendance.view",
  ]);
  const supabase = await createClient();
  const [employee, document] = await Promise.all([
    getEmployeeById(supabase, profile.employee.id),
    getAttendancePolicyDocument(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
      <AttendancePolicyView
        backHref={EMPLOYEE_ROUTES.attendance}
        employeeName={resolveEmployeeGreetingName(employee)}
        document={document}
      />
    </div>
  );
}
