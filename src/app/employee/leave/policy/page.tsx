import { LeavePolicyView } from "@/components/leave/leave-policy-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { hidePeriodLeaveFromPolicyDocument } from "@/lib/leave/leave-policy-employee-display";
import { getPolicyCategoryForEmployee } from "@/lib/leave/leave-policy-category";
import { getLeavePolicyPageData } from "@/lib/leave/services/leave-policy-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

function resolveEmployeeGreetingName(
  employee: Awaited<ReturnType<typeof getEmployeeById>>,
): string {
  const preferred = employee?.profile?.preferredName?.trim();
  if (preferred) return preferred;

  const firstName = employee?.firstName?.trim();
  if (firstName) return firstName;

  return "Employee";
}

export default async function EmployeeLeavePolicyPage() {
  const profile = await requireServerAnyPermission([PORTAL_PERMISSIONS.employee, "leave.view"]);
  const supabase = await createClient();
  const [employee, policy, defaultCategory] = await Promise.all([
    getEmployeeById(supabase, profile.employee.id),
    getLeavePolicyPageData(supabase, profile.employee.organizationId),
    getPolicyCategoryForEmployee(supabase, profile.employee.id),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
      <LeavePolicyView
        backHref={EMPLOYEE_ROUTES.leave}
        employeeName={resolveEmployeeGreetingName(employee)}
        fullTimeDocument={hidePeriodLeaveFromPolicyDocument(policy.document)}
        internProbationDocument={hidePeriodLeaveFromPolicyDocument(
          policy.internProbationDocument,
        )}
        defaultCategory={defaultCategory}
        mandatoryHolidays={policy.mandatoryHolidays}
        optionalHolidays={policy.optionalHolidays}
        holidayYear={policy.holidayYear}
      />
    </div>
  );
}
