import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type {
  EmployeeAddressDetail,
  EmployeeDetail,
  EmployeeDocumentDetail,
  EmployeeProfileDetail,
  EmergencyContactDetail,
} from "@/types/employee";

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getEmployeeById(
  supabase: AuthSupabaseClient,
  employeeId: string,
): Promise<EmployeeDetail | null> {
  const { data: employee, error } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
        id,
        organization_id,
        branch_id,
        department_id,
        designation_id,
        employment_type_id,
        reporting_manager_id,
        user_id,
        employee_code,
        first_name,
        last_name,
        email,
        phone,
        employment_status,
        date_of_joining,
        date_of_leaving,
        status,
        created_at,
        updated_at,
        branches:branch_id (name),
        departments:department_id (name),
        designations:designation_id (title),
        employment_types:employment_type_id (name),
        manager:reporting_manager_id (first_name, last_name)
      `,
    )
    .eq("id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !employee) {
    return null;
  }

  const [
    profileResult,
    addressesResult,
    contactsResult,
    documentsResult,
  ] = await Promise.all([
    supabase
      .schema("hrms")
      .from("employee_profiles")
      .select(
        "id, date_of_birth, gender, marital_status, nationality, blood_group, personal_email, personal_phone, profile_image_storage_path, bio",
      )
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .schema("hrms")
      .from("employee_addresses")
      .select(
        "id, address_type, address_line1, address_line2, city, state, postal_code, country, is_primary",
      )
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false }),
    supabase
      .schema("hrms")
      .from("emergency_contacts")
      .select("id, name, relationship, phone, email, is_primary")
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("is_primary", { ascending: false }),
    supabase
      .schema("hrms")
      .from("employee_documents")
      .select(
        `
          id,
          title,
          file_name,
          mime_type,
          file_size_bytes,
          storage_path,
          document_status,
          issued_date,
          expiry_date,
          document_type_id,
          created_at,
          document_types:document_type_id (name)
        `,
      )
      .eq("employee_id", employeeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const branch = unwrapRelation(
    employee.branches as { name: string } | { name: string }[] | null,
  );
  const department = unwrapRelation(
    employee.departments as { name: string } | { name: string }[] | null,
  );
  const designation = unwrapRelation(
    employee.designations as { title: string } | { title: string }[] | null,
  );
  const employmentType = unwrapRelation(
    employee.employment_types as { name: string } | { name: string }[] | null,
  );
  const manager = unwrapRelation(
    employee.manager as
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null,
  );

  const profile: EmployeeProfileDetail | null = profileResult.data
    ? {
        id: profileResult.data.id,
        dateOfBirth: profileResult.data.date_of_birth,
        gender: profileResult.data.gender,
        maritalStatus: profileResult.data.marital_status,
        nationality: profileResult.data.nationality,
        bloodGroup: profileResult.data.blood_group,
        personalEmail: profileResult.data.personal_email,
        personalPhone: profileResult.data.personal_phone,
        profileImageStoragePath: profileResult.data.profile_image_storage_path,
        bio: profileResult.data.bio,
      }
    : null;

  const addresses: EmployeeAddressDetail[] = (addressesResult.data ?? []).map(
    (row) => ({
      id: row.id,
      addressType: row.address_type,
      addressLine1: row.address_line1,
      addressLine2: row.address_line2,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      country: row.country,
      isPrimary: row.is_primary,
    }),
  );

  const emergencyContacts: EmergencyContactDetail[] = (
    contactsResult.data ?? []
  ).map((row) => ({
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    phone: row.phone,
    email: row.email,
    isPrimary: row.is_primary,
  }));

  const documents: EmployeeDocumentDetail[] = (documentsResult.data ?? []).map(
    (row) => {
      const documentType = unwrapRelation(
        row.document_types as { name: string } | { name: string }[] | null,
      );

      return {
        id: row.id,
        title: row.title,
        fileName: row.file_name,
        mimeType: row.mime_type,
        fileSizeBytes: row.file_size_bytes,
        storagePath: row.storage_path,
        documentStatus: row.document_status,
        issuedDate: row.issued_date,
        expiryDate: row.expiry_date,
        documentTypeId: row.document_type_id,
        documentTypeName: documentType?.name ?? null,
        createdAt: row.created_at,
      };
    },
  );

  return {
    id: employee.id,
    organizationId: employee.organization_id,
    branchId: employee.branch_id,
    departmentId: employee.department_id,
    designationId: employee.designation_id,
    employmentTypeId: employee.employment_type_id,
    reportingManagerId: employee.reporting_manager_id,
    userId: employee.user_id,
    employeeCode: employee.employee_code,
    firstName: employee.first_name,
    lastName: employee.last_name,
    email: employee.email,
    phone: employee.phone,
    employmentStatus: employee.employment_status,
    dateOfJoining: employee.date_of_joining,
    dateOfLeaving: employee.date_of_leaving,
    status: employee.status,
    createdAt: employee.created_at,
    updatedAt: employee.updated_at,
    branchName: branch?.name ?? null,
    departmentName: department?.name ?? null,
    designationTitle: designation?.title ?? null,
    employmentTypeName: employmentType?.name ?? null,
    reportingManagerName: manager
      ? `${manager.first_name} ${manager.last_name}`
      : null,
    profile,
    addresses,
    emergencyContacts,
    documents,
  };
}

export async function getEmployeeAttendance(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select("id, attendance_date, check_in_time, check_out_time, status")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("attendance_date", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEmployeeLeaveRequests(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_requests")
    .select("id, start_date, end_date, total_days, status, reason")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("start_date", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getEmployeePayrollItems(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      "id, gross_pay, net_pay, status, payrolls:payroll_id (pay_period_start, pay_period_end, status)",
    )
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}
