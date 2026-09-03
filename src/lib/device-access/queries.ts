import { isEmployeeAppVisible } from "@/lib/employees/app-hidden";
import { cleanDisplayText } from "@/lib/employees/parse-employee-name";
import {
  DIRECTORY_HIDDEN_EMPLOYEE_CODES,
  isHiddenFromEmployeeDirectory,
} from "@/lib/employee/directory-listing";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

export type DeviceAccessEmployeeRow = {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  tabletAccessEnabled: boolean;
};

type QueryRow = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string | null;
  deleted_at: string | null;
  app_hidden_at: string | null;
  tablet_access_enabled: boolean | null;
  departments: { name: string } | { name: string }[] | null;
  designations: { title: string } | { title: string }[] | null;
};

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listDeviceAccessEmployees(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<DeviceAccessEmployeeRow[]> {
  const hiddenCodes = [...DIRECTORY_HIDDEN_EMPLOYEE_CODES];
  let query = supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        employee_code,
        first_name,
        last_name,
        email,
        deleted_at,
        app_hidden_at,
        tablet_access_enabled,
        departments:department_id (name),
        designations:designation_id (title)
      `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("app_hidden_at", null);

  if (hiddenCodes.length > 0) {
    query = query.not("employee_code", "in", `(${hiddenCodes.join(",")})`);
  }

  const { data, error } = await query.order("employee_code", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as QueryRow[])
    .filter((row) => isEmployeeAppVisible(row))
    .filter((row) => {
      const firstName = cleanDisplayText(row.first_name);
      const lastName = cleanDisplayText(row.last_name);
      const designation = unwrapRelation(row.designations)?.title?.trim() ?? null;
      if (
        isHiddenFromEmployeeDirectory(row.employee_code, {
          employeeCode: row.employee_code,
          firstName,
          lastName,
          designationTitle: designation,
        })
      ) {
        return false;
      }
      if ((designation ?? "").toLowerCase() === "marketing manager") {
        return false;
      }
      return true;
    })
    .map((row) => {
      const firstName = cleanDisplayText(row.first_name);
      const lastName = cleanDisplayText(row.last_name);
      const name = `${firstName} ${lastName}`.trim() || row.employee_code;
      return {
        id: row.id,
        employeeCode: row.employee_code,
        name,
        department: unwrapRelation(row.departments)?.name?.trim() || "—",
        designation: unwrapRelation(row.designations)?.title?.trim() || "—",
        tabletAccessEnabled: row.tablet_access_enabled === true,
      };
    });
}
