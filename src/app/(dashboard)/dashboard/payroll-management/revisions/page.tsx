import {
  SalaryRevisionForm,
  SalaryRevisionTable,
} from "@/components/payroll/salary-revision-management";
import { createClient } from "@/lib/supabase/server";
import {
  getPayrollLookups,
  listSalaryRevisions,
} from "@/lib/payroll/services/payroll-queries";
import { salaryRevisionListParamsSchema } from "@/lib/validations/payroll";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { canEditSalary } from "@/lib/payroll/constants";

type SalaryRevisionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SalaryRevisionsPage({
  searchParams,
}: SalaryRevisionsPageProps) {
  const profile = await requireServerAnyPermission([
    "salary.view",
    "salary_structure.view",
  ]);
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = salaryRevisionListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    revisionStatus: rawParams.revisionStatus,
    employeeId: rawParams.employeeId,
  });

  const [result, lookups] = await Promise.all([
    listSalaryRevisions(supabase, profile, params),
    getPayrollLookups(supabase, profile.employee.organizationId),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Salary Revisions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Maintain salary history with effective dates, reasons, and approvals.
        </p>
      </div>
      {canEditSalary(profile.permissionCodes) ? (
        <SalaryRevisionForm employees={lookups.employees} />
      ) : null}
      <SalaryRevisionTable records={result.data} />
    </>
  );
}
