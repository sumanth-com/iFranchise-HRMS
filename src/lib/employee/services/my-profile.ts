import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { MyProfileBundle } from "@/types/my-profile";
import type { EmployeeSelfProfileSettings } from "@/lib/employee/services/employee-self-profile";
import { cleanDisplayText } from "@/lib/employees/parse-employee-name";

const DEFAULT_LANGUAGE = "en";
const DEFAULT_TIMEZONE = "Asia/Kolkata";

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function profileTimingEnabled() {
  return process.env.NODE_ENV === "development";
}

function logProfileTiming(label: string, startedAt: number) {
  if (!profileTimingEnabled()) return;
  console.info(
    `[my-profile] ${label}: ${Math.round(performance.now() - startedAt)}ms`,
  );
}

/**
 * Lean self-profile loader for My Profile pages.
 * Fetches only columns the UI renders — no documents, no full attendance history,
 * no duplicate employee/detail loaders, no blocking storage signed URL.
 */
export async function getMyProfileBundle(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  profilePath: string,
): Promise<MyProfileBundle | null> {
  const employeeId = profile.employee?.id;
  if (!employeeId) return null;

  const totalStartedAt = performance.now();
  const queriesStartedAt = performance.now();

  const [employeeResult, profileResult, addressResult, contactResult, prefsResult] =
    await Promise.all([
      supabase
        .schema("hrms")
        .from("employees")
        .select(
          `
          id,
          employee_code,
          first_name,
          last_name,
          email,
          employment_status,
          account_status,
          date_of_joining,
          reporting_manager_id,
          assigned_hr_employee_id,
          departments:department_id (name),
          designations:designation_id (title),
          employment_types:employment_type_id (name),
          manager:reporting_manager_id (first_name, last_name),
          assigned_hr:assigned_hr_employee_id (first_name, last_name)
        `,
        )
        .eq("id", employeeId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .schema("hrms")
        .from("employee_profiles")
        .select(
          "personal_email, personal_phone, profile_image_storage_path, self_profile_submitted_at, gender",
        )
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .schema("hrms")
        .from("employee_addresses")
        .select("id, address_line1, address_line2, city, state, postal_code, country")
        .eq("employee_id", employeeId)
        .eq("address_type", "current")
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .schema("hrms")
        .from("emergency_contacts")
        .select("id, name, relationship, phone, email")
        .eq("employee_id", employeeId)
        .is("deleted_at", null)
        .order("is_primary", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .schema("hrms")
        .from("user_preferences")
        .select("language, timezone")
        .eq("organization_id", profile.employee.organizationId)
        .eq("user_id", profile.userId)
        .is("deleted_at", null)
        .maybeSingle(),
    ]);

  logProfileTiming("parallel queries", queriesStartedAt);

  if (employeeResult.error) {
    console.error("[getMyProfileBundle] employee query failed:", employeeResult.error.message);
    return null;
  }
  if (!employeeResult.data) return null;

  const employee = employeeResult.data;
  const department = unwrapRelation(
    employee.departments as { name?: string } | { name?: string }[] | null,
  );
  const designation = unwrapRelation(
    employee.designations as { title?: string } | { title?: string }[] | null,
  );
  const employmentType = unwrapRelation(
    employee.employment_types as { name?: string } | { name?: string }[] | null,
  );
  const manager = unwrapRelation(
    employee.manager as
      | { first_name?: string; last_name?: string }
      | { first_name?: string; last_name?: string }[]
      | null,
  );
  const assignedHr = unwrapRelation(
    employee.assigned_hr as
      | { first_name?: string; last_name?: string }
      | { first_name?: string; last_name?: string }[]
      | null,
  );

  const firstName = cleanDisplayText(employee.first_name);
  const lastName = cleanDisplayText(employee.last_name);
  const departmentName = department?.name ?? null;
  const designationTitle = designation?.title ?? null;
  const profileImagePath = profileResult.data?.profile_image_storage_path?.trim() || null;

  const profileSettings: EmployeeSelfProfileSettings = {
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    email: employee.email ?? profile.email,
    firstName,
    lastName,
    departmentName,
    designationTitle,
    personalEmail: profileResult.data?.personal_email ?? "",
    personalPhone: profileResult.data?.personal_phone ?? "",
    language: prefsResult.data?.language ?? DEFAULT_LANGUAGE,
    timezone: prefsResult.data?.timezone ?? DEFAULT_TIMEZONE,
    profileImageStoragePath: profileImagePath,
    gender: (profileResult.data?.gender as string | null) ?? null,
    address: {
      id: addressResult.data?.id ?? null,
      addressLine1: addressResult.data?.address_line1 ?? "",
      addressLine2: addressResult.data?.address_line2 ?? "",
      city: addressResult.data?.city ?? "",
      state: addressResult.data?.state ?? "",
      postalCode: addressResult.data?.postal_code ?? "",
      country: addressResult.data?.country ?? "IN",
    },
    emergencyContact: {
      id: contactResult.data?.id ?? null,
      name: contactResult.data?.name ?? "",
      relationship: contactResult.data?.relationship ?? "",
      phone: contactResult.data?.phone ?? "",
      email: contactResult.data?.email ?? "",
    },
  };

  const reportingManagerName = manager
    ? `${cleanDisplayText(manager.first_name ?? "")} ${cleanDisplayText(manager.last_name ?? "")}`.trim() ||
      null
    : null;
  const assignedHrName = assignedHr
    ? `${cleanDisplayText(assignedHr.first_name ?? "")} ${cleanDisplayText(assignedHr.last_name ?? "")}`.trim() ||
      null
    : null;

  const bundle: MyProfileBundle = {
    employeeId: employee.id,
    employeeCode: employee.employee_code,
    firstName,
    lastName,
    email: employee.email ?? profile.email,
    employmentStatus: employee.employment_status,
    accountStatus: employee.account_status,
    departmentName,
    designationTitle,
    employmentTypeName: employmentType?.name ?? null,
    reportingManagerId: employee.reporting_manager_id,
    reportingManagerName,
    assignedHrEmployeeId: employee.assigned_hr_employee_id ?? null,
    assignedHrName,
    dateOfJoining: employee.date_of_joining,
    // Not rendered on My Profile — keep shape stable without an unbounded attendance scan.
    attendanceSummary: {
      presentDays: 0,
      totalWorkHours: 0,
    },
    // Defer signing to EmployeeIdCard (client) so identity fields paint without storage RTT.
    profileImageUrl: null,
    profileImagePath,
    profileSettings,
    selfProfileSubmittedAt: profileResult.data?.self_profile_submitted_at ?? null,
    profilePath,
  };

  logProfileTiming("total getMyProfileBundle", totalStartedAt);
  return bundle;
}
