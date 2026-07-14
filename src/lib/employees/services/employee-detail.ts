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
        account_status,
        invitation_sent_at,
        invitation_cancelled_at,
        first_login_at,
        last_login_at,
        password_last_reset_at,
        account_suspended_at,
        account_deactivated_at,
        account_activated_at,
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
    accountStatus: employee.account_status,
    invitationSentAt: employee.invitation_sent_at,
    invitationCancelledAt: employee.invitation_cancelled_at,
    firstLoginAt: employee.first_login_at,
    lastLoginAt: employee.last_login_at,
    passwordLastResetAt: employee.password_last_reset_at,
    accountSuspendedAt: employee.account_suspended_at,
    accountDeactivatedAt: employee.account_deactivated_at,
    accountActivatedAt: employee.account_activated_at,
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
    .select(
      "id, attendance_date, check_in_at, check_out_at, attendance_status, work_hours",
    )
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
    .select(
      "id, start_date, end_date, total_days, leave_status, reason, applied_at, leave_types:leave_type_id (name, code)",
    )
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("applied_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const leaveType = unwrapRelation(
      row.leave_types as
        | { name: string; code: string }
        | { name: string; code: string }[]
        | null,
    );

    return {
      id: row.id,
      leaveTypeName: leaveType?.name ?? "Leave",
      startDate: row.start_date,
      endDate: row.end_date,
      totalDays: Number(row.total_days),
      leaveStatus: row.leave_status,
      appliedAt: row.applied_at,
      reason: row.reason,
    };
  });
}

export async function getEmployeeLeaveApprovals(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_approvals")
    .select(
      `
      id,
      approval_level,
      approval_status,
      comments,
      acted_at,
      leave_requests!inner (
        id,
        start_date,
        end_date,
        leave_status,
        employee_id
      ),
      approver:approver_employee_id (
        first_name,
        last_name,
        employee_code
      )
    `,
    )
    .eq("leave_requests.employee_id", employeeId)
    .is("deleted_at", null)
    .order("acted_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const leaveRequest = unwrapRelation(
      row.leave_requests as
        | {
            id: string;
            start_date: string;
            end_date: string;
            leave_status: string;
          }
        | {
            id: string;
            start_date: string;
            end_date: string;
            leave_status: string;
          }[]
        | null,
    );
    const approver = unwrapRelation(
      row.approver as
        | {
            first_name: string;
            last_name: string;
            employee_code: string | null;
          }
        | {
            first_name: string;
            last_name: string;
            employee_code: string | null;
          }[]
        | null,
    );

    const approverName = approver
      ? [approver.first_name, approver.last_name].filter(Boolean).join(" ")
      : "—";

    return {
      id: row.id,
      leaveRequestId: leaveRequest?.id ?? "",
      approvalLevel: row.approval_level,
      approvalStatus: row.approval_status,
      approverName,
      comments: row.comments,
      actedAt: row.acted_at,
      leaveStartDate: leaveRequest?.start_date ?? "",
      leaveEndDate: leaveRequest?.end_date ?? "",
      leaveStatus: leaveRequest?.leave_status ?? "",
    };
  });
}

export async function getEmployeePayrollItems(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("payroll_items")
    .select(
      "id, gross_salary, net_salary, status, payrolls:payroll_id (payroll_month, payroll_status)",
    )
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const payroll = unwrapRelation(
      row.payrolls as
        | { payroll_month: string; payroll_status: string }
        | { payroll_month: string; payroll_status: string }[]
        | null,
    );

    return {
      id: row.id,
      gross_salary: row.gross_salary,
      net_salary: row.net_salary,
      status: row.status,
      payroll_month: payroll?.payroll_month ?? null,
      payroll_status: payroll?.payroll_status ?? null,
    };
  });
}

export async function getEmployeeBankAccounts(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("bank_accounts")
    .select(
      "id, bank_name, account_holder_name, account_number, ifsc_code, branch_name, account_type, is_primary",
    )
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("is_primary", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    bankName: row.bank_name,
    accountHolderName: row.account_holder_name,
    accountNumber: row.account_number,
    ifscCode: row.ifsc_code,
    branchName: row.branch_name,
    accountType: row.account_type,
    isPrimary: row.is_primary,
  }));
}

export async function getEmployeeLeaveBalances(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("leave_balances")
    .select(
      "id, balance_year, allocated_days, used_days, pending_days, balance_days, leave_types:leave_type_id (name, code)",
    )
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("balance_year", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const leaveType = unwrapRelation(
      row.leave_types as
        | { name: string; code: string }
        | { name: string; code: string }[]
        | null,
    );

    return {
      id: row.id,
      leaveTypeName: leaveType?.name ?? "Leave",
      leaveTypeCode: leaveType?.code ?? "",
      balanceYear: row.balance_year,
      allocatedDays: Number(row.allocated_days),
      usedDays: Number(row.used_days),
      pendingDays: Number(row.pending_days),
      balanceDays: Number(row.balance_days),
    };
  });
}

export async function getEmployeeSalaryStructure(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select(
      "id, effective_from, effective_to, currency_code, basic_salary, hra_amount, transport_allowance, other_allowances, gross_salary, net_salary, components",
    )
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    effectiveFrom: data.effective_from,
    effectiveTo: data.effective_to,
    currencyCode: data.currency_code,
    basicSalary: Number(data.basic_salary),
    hraAmount: Number(data.hra_amount),
    transportAllowance: Number(data.transport_allowance),
    otherAllowances: Number(data.other_allowances),
    grossSalary: Number(data.gross_salary),
    netSalary: Number(data.net_salary),
    components: (data.components as Record<string, unknown>) ?? {},
  };
}

export async function getEmployeeAttendanceSummary(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("attendance")
    .select("attendance_status, work_hours")
    .eq("employee_id", employeeId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const records = data ?? [];

  return {
    totalRecords: records.length,
    presentDays: records.filter((row) => row.attendance_status === "present")
      .length,
    totalWorkHours: records.reduce(
      (total, row) => total + Number(row.work_hours ?? 0),
      0,
    ),
  };
}

export async function getEmployeeTimeline(
  supabase: AuthSupabaseClient,
  employeeId: string,
) {
  const { data, error } = await supabase
    .schema("hrms")
    .from("audit_logs")
    .select("id, operation, new_record, occurred_at")
    .eq("record_id", employeeId)
    .is("deleted_at", null)
    .order("occurred_at", { ascending: false })
    .limit(25);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const payload = (row.new_record as Record<string, unknown>) ?? {};
    const event =
      typeof payload.event === "string" ? payload.event : row.operation;

    const description =
      typeof payload.full_name === "string"
        ? `${payload.full_name} (${String(payload.employee_code ?? "")})`
        : event;

    return {
      id: row.id,
      event,
      description,
      occurredAt: row.occurred_at,
    };
  });
}
