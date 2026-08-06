import { PayrollPolicyView } from "@/components/payroll/payroll-policy-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { getPayrollPolicyDocument } from "@/lib/payroll/services/payroll-policy-queries";
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

export default async function EmployeePayrollPolicyPage() {
  const profile = await requireServerAnyPermission([
    PORTAL_PERMISSIONS.employee,
    "payslip.view",
  ]);
  const supabase = await createClient();
  const [employee, document] = await Promise.all([
    getEmployeeById(supabase, profile.employee.id),
    getPayrollPolicyDocument(supabase, profile.employee.organizationId),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
      <PayrollPolicyView
        backHref={EMPLOYEE_ROUTES.payroll}
        employeeName={resolveEmployeeGreetingName(employee)}
        document={document}
      />
    </div>
  );
}
