import { SalaryStructureForm } from "@/components/payroll/salary-structure-form";
import { createClient } from "@/lib/supabase/server";
import { getPayrollLookups } from "@/lib/payroll/services/payroll-queries";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function NewSalaryStructurePage() {
  const profile = await requireServerAnyPermission([
    "salary.edit",
    "salary_structure.create",
    "salary_structure.edit",
  ]);
  const supabase = await createClient();
  const lookups = await getPayrollLookups(
    supabase,
    profile.employee.organizationId,
  );

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New salary structure</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new versioned salary structure for an employee.
        </p>
      </div>
      <SalaryStructureForm employees={lookups.employees} />
    </>
  );
}
