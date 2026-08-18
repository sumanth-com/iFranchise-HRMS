import { LeavePolicyView } from "@/components/leave/leave-policy-view";
import { SELF_LEAVE_ROUTES } from "@/lib/leave/constants";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { getEmployeeLeaveBalanceSnapshot } from "@/lib/leave/services/leave-queries";
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

export default async function SelfLeavePolicyPage() {
  const profile = await requireServerAnyPermission(["leave.view"]);
  const supabase = await createClient();
  const [employee, policy, yearUsage] = await Promise.all([
    getEmployeeById(supabase, profile.employee.id),
    getLeavePolicyPageData(supabase, profile.employee.organizationId),
    getEmployeeLeaveBalanceSnapshot(supabase, profile.employee.id),
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
      <LeavePolicyView
        backHref={SELF_LEAVE_ROUTES.list}
        backLabel="Back to Leave"
        employeeName={resolveEmployeeGreetingName(employee)}
        document={policy.document}
        mandatoryHolidays={policy.mandatoryHolidays}
        optionalHolidays={policy.optionalHolidays}
        holidayYear={policy.holidayYear}
        yearUsage={yearUsage}
      />
    </div>
  );
}
