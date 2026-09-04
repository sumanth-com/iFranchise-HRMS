import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { isExcludedFromTeamPayslips } from "@/lib/employee/directory-listing";
import { resolveEmployeeBankName } from "@/lib/payroll/services/ifsc-bank-names";
import type { UserProfile } from "@/types/auth";
import type {
  EmployeeAccountListItem,
  EmployeeAccountListParams,
  EmployeeAccountListResult,
} from "@/types/employee-accounts";
import { employeeAccountListParamsSchema } from "@/lib/validations/payroll";

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type EmployeeRow = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  department_id: string | null;
  departments: { name: string } | { name: string }[] | null;
  designations: { title: string } | { title: string }[] | null;
  employee_profiles:
    | {
        date_of_birth: string | null;
        pan_number: string | null;
        aadhaar_number: string | null;
      }
    | {
        date_of_birth: string | null;
        pan_number: string | null;
        aadhaar_number: string | null;
      }[]
    | null;
};

type BankRow = {
  id: string;
  employee_id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string | null;
  branch_name: string | null;
};

function mapEmployeeAccountRow(
  row: EmployeeRow,
  bank: BankRow | null,
): EmployeeAccountListItem {
  const profile = unwrapRelation(row.employee_profiles);
  const department = unwrapRelation(row.departments);
  const bankName = bank ? resolveEmployeeBankName(bank.bank_name, bank.ifsc_code) : null;

  return {
    employeeId: row.id,
    employeeCode: row.employee_code,
    employeeName: `${row.first_name} ${row.last_name}`.trim(),
    departmentId: row.department_id,
    departmentName: department?.name ?? null,
    dateOfBirth: profile?.date_of_birth ?? null,
    aadhaarNumber: profile?.aadhaar_number ?? null,
    panNumber: profile?.pan_number ?? null,
    bankAccountId: bank?.id ?? null,
    bankName,
    accountNumber: bank?.account_number ?? null,
    accountHolderName: bank?.account_holder_name ?? null,
    ifscCode: bank?.ifsc_code ?? null,
    branchName: bank?.branch_name ?? null,
    hasBankAccount: Boolean(bank?.account_number),
    hasIdentityDetails: Boolean(profile?.pan_number || profile?.aadhaar_number),
  };
}

export async function listEmployeeAccounts(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: EmployeeAccountListParams,
): Promise<EmployeeAccountListResult> {
  const { page, pageSize, search, department } = employeeAccountListParamsSchema.parse(params);
  const organizationId = profile.employee.organizationId;

  let departmentId: string | undefined;
  if (department) {
    const { data: departmentRow, error: departmentError } = await supabase
      .schema("hrms")
      .from("departments")
      .select("id")
      .eq("organization_id", organizationId)
      .ilike("code", department)
      .is("deleted_at", null)
      .maybeSingle();
    if (departmentError) throw new Error(departmentError.message);
    if (!departmentRow?.id) {
      return { data: [], total: 0, page, pageSize };
    }
    departmentId = departmentRow.id;
  }

  let query = supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        department_id,
        departments:department_id (name),
        designations:designation_id (title),
        employee_profiles (
          date_of_birth,
          pan_number,
          aadhaar_number
        )
      `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("app_hidden_at", null)
    .in("employment_status", ["active", "probation", "on_leave"])
    .order("first_name")
    .order("last_name");

  if (departmentId) {
    query = query.eq("department_id", departmentId);
  }

  if (search) {
    const escaped = search.replace(/[%_,.()\"\\]/g, " ").trim();
    if (escaped) {
      const term = `%${escaped}%`;
      query = query.or(
        [
          `first_name.ilike."${term}"`,
          `last_name.ilike."${term}"`,
          `employee_code.ilike."${term}"`,
        ].join(","),
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const visibleRows = ((data ?? []) as EmployeeRow[]).filter((row) => {
    const designation = unwrapRelation(row.designations);
    return !isExcludedFromTeamPayslips(row.employee_code, {
      employeeCode: row.employee_code,
      firstName: row.first_name,
      lastName: row.last_name,
      designationTitle: designation?.title ?? null,
    });
  });

  const employeeIds = visibleRows.map((row) => row.id);
  const bankByEmployee = new Map<string, BankRow>();

  if (employeeIds.length > 0) {
    const { data: bankRows, error: bankError } = await supabase
      .schema("hrms")
      .from("bank_accounts")
      .select(
        "id, employee_id, bank_name, account_holder_name, account_number, ifsc_code, branch_name",
      )
      .in("employee_id", employeeIds)
      .eq("is_primary", true)
      .is("deleted_at", null);

    if (bankError) throw new Error(bankError.message);
    for (const bank of (bankRows ?? []) as BankRow[]) {
      bankByEmployee.set(bank.employee_id, bank);
    }
  }

  const mapped = visibleRows.map((row) =>
    mapEmployeeAccountRow(row, bankByEmployee.get(row.id) ?? null),
  );

  const total = mapped.length;
  const from = (page - 1) * pageSize;

  return {
    data: mapped.slice(from, from + pageSize),
    total,
    page,
    pageSize,
  };
}

export async function getEmployeeAccountByEmployeeId(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
): Promise<EmployeeAccountListItem | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        department_id,
        departments:department_id (name),
        designations:designation_id (title),
        employee_profiles (
          date_of_birth,
          pan_number,
          aadhaar_number
        )
      `,
    )
    .eq("organization_id", profile.employee.organizationId)
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: bank } = await supabase
    .schema("hrms")
    .from("bank_accounts")
    .select(
      "id, employee_id, bank_name, account_holder_name, account_number, ifsc_code, branch_name",
    )
    .eq("employee_id", employeeId)
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();

  return mapEmployeeAccountRow(data as EmployeeRow, (bank as BankRow | null) ?? null);
}
