import { LeavePolicyEditor } from "@/components/leave/leave-policy-editor";
import { LeavePolicyView } from "@/components/leave/leave-policy-view";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import { LEAVE_ROUTES } from "@/lib/leave/constants";
import { canEditLeavePolicy } from "@/lib/leave/leave-policy-permissions";
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

export default async function HrLeavePolicyPage() {
  const profile = await requireServerAnyPermission(["leave.view"]);
  const supabase = await createClient();
  const canEdit = canEditLeavePolicy(profile);

  const [employee, policy] = await Promise.all([
    getEmployeeById(supabase, profile.employee.id),
    getLeavePolicyPageData(supabase, profile.employee.organizationId),
  ]);

  const employeeName = resolveEmployeeGreetingName(employee);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
      {canEdit ? (
        <LeavePolicyEditor
          backHref={LEAVE_ROUTES.list}
          employeeName={employeeName}
          initialDocument={policy.document}
          mandatoryHolidays={policy.mandatoryHolidays}
          optionalHolidays={policy.optionalHolidays}
          holidayYear={policy.holidayYear}
        />
      ) : (
        <LeavePolicyView
          backHref={LEAVE_ROUTES.list}
          backLabel="Back to Leave"
          employeeName={employeeName}
          document={policy.document}
          mandatoryHolidays={policy.mandatoryHolidays}
          optionalHolidays={policy.optionalHolidays}
          holidayYear={policy.holidayYear}
        />
      )}
    </div>
  );
}
