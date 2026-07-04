import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { EmployeeUpdateInput, EmployeeWizardInputValidated } from "@/lib/validations/employee";
import { EMPLOYEE_STORAGE_BUCKETS, DESIGNATION_OTHER_VALUE } from "@/lib/employees/constants";

function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value : null;
}

function slugifyDesignationCode(title: string): string {
  const slug = title
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return slug || "OTHER";
}

export async function resolveOrCreateDesignation(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string,
  title: string,
): Promise<string> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    throw new Error("Designation is required");
  }

  const { data: existingRows, error: findError } = await supabase
    .schema("hrms")
    .from("designations")
    .select("id, title")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .eq("status", "active");

  if (findError) {
    throw new Error(findError.message);
  }

  const existing = (existingRows ?? []).find(
    (row) => row.title.trim().toLowerCase() === trimmedTitle.toLowerCase(),
  );

  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .schema("hrms")
    .from("designations")
    .insert({
      organization_id: organizationId,
      title: trimmedTitle,
      code: `${slugifyDesignationCode(trimmedTitle)}_${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to create designation");
  }

  return created.id;
}

export async function createEmployeeFromWizard(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: EmployeeWizardInputValidated,
): Promise<string> {
  const userId = profile.userId;
  const organizationId = profile.employee.organizationId;
  const { basic, employment, address, emergencyContact, documents } = input;

  const { data: employee, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .insert({
      organization_id: organizationId,
      branch_id: employment.branchId,
      department_id: emptyToNull(employment.departmentId),
      designation_id: emptyToNull(employment.designationId),
      employment_type_id: emptyToNull(employment.employmentTypeId),
      reporting_manager_id: emptyToNull(employment.reportingManagerId),
      employee_code: basic.employeeCode.trim(),
      first_name: basic.firstName.trim(),
      last_name: basic.lastName.trim(),
      email: basic.email.trim().toLowerCase(),
      phone: emptyToNull(basic.phone),
      employment_status: employment.employmentStatus,
      date_of_joining: emptyToNull(employment.dateOfJoining),
      date_of_leaving: emptyToNull(employment.dateOfLeaving),
      status: "active",
      created_by: userId,
      updated_by: userId,
    })
    .select("id")
    .single();

  if (employeeError || !employee) {
    throw new Error(employeeError?.message ?? "Failed to create employee");
  }

  const employeeId = employee.id;

  const { error: profileError } = await supabase
    .schema("hrms")
    .from("employee_profiles")
    .insert({
      employee_id: employeeId,
      date_of_birth: emptyToNull(basic.dateOfBirth),
      gender: basic.gender ?? null,
      marital_status: basic.maritalStatus ?? null,
      nationality: emptyToNull(basic.nationality),
      blood_group: emptyToNull(basic.bloodGroup),
      personal_email: emptyToNull(basic.personalEmail)?.toLowerCase() ?? null,
      personal_phone: emptyToNull(basic.personalPhone),
      bio: emptyToNull(basic.bio),
      status: "active",
      created_by: userId,
      updated_by: userId,
    });

  if (profileError) {
    throw new Error(profileError.message);
  }

  const { error: addressError } = await supabase
    .schema("hrms")
    .from("employee_addresses")
    .insert({
      employee_id: employeeId,
      address_type: address.addressType,
      address_line1: address.addressLine1.trim(),
      address_line2: emptyToNull(address.addressLine2),
      city: address.city.trim(),
      state: emptyToNull(address.state),
      postal_code: emptyToNull(address.postalCode),
      country: address.country.trim(),
      is_primary: address.isPrimary,
      status: "active",
      created_by: userId,
      updated_by: userId,
    });

  if (addressError) {
    throw new Error(addressError.message);
  }

  const { error: contactError } = await supabase
    .schema("hrms")
    .from("emergency_contacts")
    .insert({
      employee_id: employeeId,
      name: emergencyContact.name.trim(),
      relationship: emergencyContact.relationship.trim(),
      phone: emergencyContact.phone.trim(),
      email: emptyToNull(emergencyContact.email)?.toLowerCase() ?? null,
      is_primary: emergencyContact.isPrimary,
      status: "active",
      created_by: userId,
      updated_by: userId,
    });

  if (contactError) {
    throw new Error(contactError.message);
  }

  if (documents.length > 0) {
    const { error: documentsError } = await supabase
      .schema("hrms")
      .from("employee_documents")
      .insert(
        documents.map((doc) => ({
          employee_id: employeeId,
          document_type_id: doc.documentTypeId,
          title: doc.title.trim(),
          storage_path: doc.storagePath,
          file_name: doc.fileName,
          mime_type: doc.mimeType,
          file_size_bytes: doc.fileSizeBytes,
          document_status: "pending",
          issued_date: emptyToNull(doc.issuedDate),
          expiry_date: emptyToNull(doc.expiryDate),
          status: "active",
          created_by: userId,
          updated_by: userId,
        })),
      );

    if (documentsError) {
      throw new Error(documentsError.message);
    }
  }

  return employeeId;
}

export async function updateEmployee(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  input: EmployeeUpdateInput,
) {
  const userId = profile.userId;

  let designationId = emptyToNull(input.designationId);

  if (input.designationId === DESIGNATION_OTHER_VALUE) {
    designationId = await resolveOrCreateDesignation(
      supabase,
      profile.employee.organizationId,
      userId,
      input.customDesignationTitle ?? "",
    );
  }

  const { error } = await supabase
    .schema("hrms")
    .from("employees")
    .update({
      branch_id: input.branchId,
      department_id: emptyToNull(input.departmentId),
      designation_id: designationId,
      employment_type_id: emptyToNull(input.employmentTypeId),
      reporting_manager_id: emptyToNull(input.reportingManagerId),
      employee_code: input.employeeCode.trim(),
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: emptyToNull(input.phone),
      employment_status: input.employmentStatus,
      date_of_joining: emptyToNull(input.dateOfJoining),
      date_of_leaving: emptyToNull(input.dateOfLeaving),
      updated_by: userId,
    })
    .eq("id", employeeId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function softDeleteEmployee(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
) {
  const now = new Date().toISOString();

  const { error } = await supabase
    .schema("hrms")
    .from("employees")
    .update({
      status: "inactive",
      employment_status: "terminated",
      date_of_leaving: now.slice(0, 10),
      deleted_at: now,
      updated_by: profile.userId,
    })
    .eq("id", employeeId)
    .is("deleted_at", null);

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadEmployeeDocument(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employeeId: string,
  file: File,
): Promise<{ storagePath: string; fileName: string; mimeType: string; fileSizeBytes: number }> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${organizationId}/${employeeId}/${crypto.randomUUID()}-${sanitizedName}`;

  const { error } = await supabase.storage
    .from(EMPLOYEE_STORAGE_BUCKETS.documents)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    storagePath,
    fileName: file.name,
    mimeType: file.type,
    fileSizeBytes: file.size,
  };
}

export async function uploadProfileImage(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employeeId: string,
  file: File,
): Promise<string> {
  const extension = file.name.split(".").pop() ?? "jpg";
  const storagePath = `${organizationId}/${employeeId}/profile.${extension}`;

  const { error } = await supabase.storage
    .from(EMPLOYEE_STORAGE_BUCKETS.profileImages)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (error) {
    throw new Error(error.message);
  }

  return storagePath;
}

export async function removeProfileImage(
  supabase: AuthSupabaseClient,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage
    .from(EMPLOYEE_STORAGE_BUCKETS.profileImages)
    .remove([storagePath]);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createSignedStorageUrl(
  supabase: AuthSupabaseClient,
  bucket: string,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function ensureDefaultDocumentTypes(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
) {
  const organizationId = profile.employee.organizationId;

  const { data: existing, error: existingError } = await supabase
    .schema("hrms")
    .from("document_types")
    .select("id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.length) {
    return;
  }

  const defaults = [
    { name: "National ID", code: "national_id", is_required: true },
    { name: "Employment Contract", code: "employment_contract", is_required: true },
    { name: "Resume", code: "resume", is_required: false },
  ];

  const { error } = await supabase.schema("hrms").from("document_types").insert(
    defaults.map((item) => ({
      organization_id: organizationId,
      name: item.name,
      code: item.code,
      is_required: item.is_required,
      requires_expiry: item.code === "national_id",
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }
}
