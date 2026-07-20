import { SalaryStructureTable } from "@/components/payroll/salary-structure-table";
import { createClient } from "@/lib/supabase/server";
import { listSalaryStructures } from "@/lib/payroll/services/payroll-queries";
import { salaryStructureListParamsSchema } from "@/lib/validations/payroll";
import { requireServerAnyPermission } from "@/lib/permissions/server";

type SalaryStructuresPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SalaryStructuresPage({
  searchParams,
}: SalaryStructuresPageProps) {
  const profile = await requireServerAnyPermission([
    "salary.view",
    "salary_structure.view",
  ]);
  const supabase = await createClient();
  const rawParams = await searchParams;

  const params = salaryStructureListParamsSchema.parse({
    page: rawParams.page,
    pageSize: rawParams.pageSize,
    search: typeof rawParams.search === "string" ? rawParams.search : undefined,
    employeeId: rawParams.employeeId,
  });

  const result = await listSalaryStructures(supabase, profile, params);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Salary Structure</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage employee compensation components and statutory deductions.
        </p>
      </div>
      <SalaryStructureTable records={result.data} />
    </>
  );
}
