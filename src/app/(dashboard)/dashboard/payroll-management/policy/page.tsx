import { PayrollPolicyEditor } from "@/components/payroll/payroll-policy-editor";
import { PayrollPolicyView } from "@/components/payroll/payroll-policy-view";
import { getEmployeeById } from "@/lib/employees/services/employee-detail";
import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";
import { canEditPayrollPolicy } from "@/lib/payroll/payroll-policy-permissions";
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

export default async function PayrollManagementPolicyPage() {
  const profile = await requireServerAnyPermission(["payroll.view", "payslip.view"]);
  const supabase = await createClient();
  const canEdit = canEditPayrollPolicy(profile);
  const backHref = payrollHubUrl({
    tab: "team",
    section: TEAM_PAYROLL_SECTIONS.settings,
  });

  const [employee, document] = await Promise.all([
    getEmployeeById(supabase, profile.employee.id),
    getPayrollPolicyDocument(supabase, profile.employee.organizationId),
  ]);

  const employeeName = resolveEmployeeGreetingName(employee);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6">
      {canEdit ? (
        <PayrollPolicyEditor
          backHref={backHref}
          backLabel="Back to Team Payroll"
          employeeName={employeeName}
          initialDocument={document}
        />
      ) : (
        <PayrollPolicyView
          backHref={backHref}
          backLabel="Back to Team Payroll"
          employeeName={employeeName}
          document={document}
        />
      )}
    </div>
  );
}
