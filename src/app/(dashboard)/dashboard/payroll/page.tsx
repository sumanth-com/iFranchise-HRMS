import { EmployeePayrollView } from "@/components/employee/payroll/employee-payroll-view";
import { SELF_DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { getEmployeePayrollData } from "@/lib/employee/services/employee-payroll-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function PayrollSelfServicePage() {
  const profile = await requireServerAnyPermission(["payroll.view", "payslip.view"]);
  const supabase = await createClient();
  const data = await getEmployeePayrollData(supabase, profile);

  return (
    <EmployeePayrollView data={data} documentsHref={SELF_DOCUMENTS_ROUTES.list} />
  );
}
