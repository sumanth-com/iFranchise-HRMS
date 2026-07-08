import { format } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { LetterPlaceholders } from "@/types/documents";
import {
  formatCurrencyInr,
  formatEmployeeName,
  fromHrms,
  unwrapRelation,
} from "@/lib/documents/services/documents-utils";

export async function buildLetterPlaceholders(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  salaryOverride?: string | null,
): Promise<LetterPlaceholders> {
  const organizationId = profile.employee.organizationId;

  const { data: employee, error } = await fromHrms(supabase, "employees")
    .select(
      `
      id,
      employee_code,
      first_name,
      last_name,
      date_of_joining,
      departments:department_id(name),
      designations:designation_id(title),
      manager:reporting_manager_id(first_name, last_name),
      organizations:organization_id(name)
    `,
    )
    .eq("id", employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!employee) throw new Error("Employee not found");

  const { data: salary } = await fromHrms(supabase, "salary_structures")
    .select("gross_salary")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .is("effective_to", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dept = unwrapRelation(employee.departments);
  const desig = unwrapRelation(employee.designations);
  const manager = unwrapRelation(employee.manager);
  const org = unwrapRelation(employee.organizations);

  const gross = salary?.gross_salary != null ? Number(salary.gross_salary) : null;

  return {
    employeeName: formatEmployeeName(employee.first_name, employee.last_name),
    employeeCode: employee.employee_code ?? "—",
    designation: desig?.title ?? "—",
    department: dept?.name ?? "—",
    joiningDate: employee.date_of_joining
      ? format(new Date(employee.date_of_joining), "dd MMM yyyy")
      : "—",
    salary: salaryOverride?.trim()
      ? salaryOverride.trim()
      : formatCurrencyInr(gross),
    companyName: org?.name ?? "iFranchise",
    manager: formatEmployeeName(manager?.first_name, manager?.last_name),
    currentDate: format(new Date(), "dd MMM yyyy"),
  };
}
