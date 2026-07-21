import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { EmployeeSelfProfileInput } from "@/lib/validations/employee";

export type EmployeeSelfProfileSettings = {
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  preferredName: string;
  language: string;
  timezone: string;
  profileImageStoragePath: string | null;
  address: {
    id: string | null;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  emergencyContact: {
    id: string | null;
    name: string;
    relationship: string;
    phone: string;
    email: string;
  };
};

const DEFAULT_LANGUAGE = "en";
const DEFAULT_TIMEZONE = "Asia/Kolkata";

function emptyToNull(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export async function getEmployeeSelfProfileSettings(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeSelfProfileSettings | null> {
  const employeeId = profile.employee?.id;
  if (!employeeId) return null;

  const [employeeResult, profileResult, addressResult, contactResult, prefsResult] =
    await Promise.all([
      supabase
        .schema("hrms")
        .from("employees")
        .select("id, email, first_name, last_name, phone")
        .eq("id", employeeId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase
        .schema("hrms")
        .from("employee_profiles")
        .select("profile_image_storage_path, preferred_name")
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

  if (employeeResult.error || !employeeResult.data) return null;

  const employee = employeeResult.data;

  return {
    employeeId: employee.id,
    email: employee.email ?? profile.email,
    firstName: employee.first_name,
    lastName: employee.last_name,
    phone: employee.phone ?? "",
    preferredName: profileResult.data?.preferred_name ?? "",
    language: prefsResult.data?.language ?? DEFAULT_LANGUAGE,
    timezone: prefsResult.data?.timezone ?? DEFAULT_TIMEZONE,
    profileImageStoragePath: profileResult.data?.profile_image_storage_path ?? null,
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
}

async function upsertUserPreferences(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  language: string,
  timezone: string,
) {
  const organizationId = profile.employee.organizationId;
  const { data: existing } = await supabase
    .schema("hrms")
    .from("user_preferences")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", profile.userId)
    .is("deleted_at", null)
    .maybeSingle();

  const payload = {
    language,
    timezone,
    updated_by: profile.userId,
  };

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("user_preferences")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.schema("hrms").from("user_preferences").insert({
    organization_id: organizationId,
    user_id: profile.userId,
    ...payload,
    status: "active",
    created_by: profile.userId,
  });
  if (error) throw new Error(error.message);
}

async function upsertEmployeeProfileRow(
  supabase: AuthSupabaseClient,
  employeeId: string,
  profile: UserProfile,
  preferredName: string | null,
) {
  const { data: existing } = await supabase
    .schema("hrms")
    .from("employee_profiles")
    .select("id")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .maybeSingle();

  const payload = {
    preferred_name: preferredName,
    updated_by: profile.userId,
  };

  if (existing?.id) {
    const { error } = await supabase
      .schema("hrms")
      .from("employee_profiles")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.schema("hrms").from("employee_profiles").insert({
    employee_id: employeeId,
    ...payload,
    status: "active",
    created_by: profile.userId,
  });
  if (error) throw new Error(error.message);
}

async function upsertCurrentAddress(
  supabase: AuthSupabaseClient,
  employeeId: string,
  profile: UserProfile,
  input: EmployeeSelfProfileInput,
  existingId: string | null,
) {
  const hasAddress =
    Boolean(input.addressLine1?.trim()) &&
    Boolean(input.city?.trim()) &&
    Boolean(input.country?.trim());

  if (!hasAddress) return;

  const payload = {
    address_line1: input.addressLine1!.trim(),
    address_line2: emptyToNull(input.addressLine2),
    city: input.city!.trim(),
    state: emptyToNull(input.state),
    postal_code: emptyToNull(input.postalCode),
    country: input.country!.trim(),
    is_primary: true,
    updated_by: profile.userId,
  };

  if (existingId) {
    const { error } = await supabase
      .schema("hrms")
      .from("employee_addresses")
      .update(payload)
      .eq("id", existingId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.schema("hrms").from("employee_addresses").insert({
    employee_id: employeeId,
    address_type: "current",
    ...payload,
    status: "active",
    created_by: profile.userId,
  });
  if (error) throw new Error(error.message);
}

async function upsertEmergencyContact(
  supabase: AuthSupabaseClient,
  employeeId: string,
  profile: UserProfile,
  input: EmployeeSelfProfileInput,
  existingId: string | null,
) {
  const name = input.emergencyContactName?.trim() ?? "";
  const phone = input.emergencyContactPhone?.trim() ?? "";
  const relationship = input.emergencyContactRelationship?.trim() ?? "";

  if (!name && !phone && !relationship) return;

  if (!name || !phone || !relationship) {
    throw new Error("Emergency contact requires name, relationship, and phone");
  }

  const payload = {
    name,
    relationship,
    phone,
    email: emptyToNull(input.emergencyContactEmail)?.toLowerCase() ?? null,
    is_primary: true,
    updated_by: profile.userId,
  };

  if (existingId) {
    const { error } = await supabase
      .schema("hrms")
      .from("emergency_contacts")
      .update(payload)
      .eq("id", existingId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await supabase.schema("hrms").from("emergency_contacts").insert({
    employee_id: employeeId,
    ...payload,
    status: "active",
    created_by: profile.userId,
  });
  if (error) throw new Error(error.message);
}

export async function updateEmployeeSelfProfile(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: EmployeeSelfProfileInput,
  existing: Pick<EmployeeSelfProfileSettings, "employeeId" | "address" | "emergencyContact">,
) {
  if (profile.employee?.id !== existing.employeeId) {
    throw new Error("You can only update your own profile");
  }

  const { error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .update({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone: emptyToNull(input.phone),
      updated_by: profile.userId,
    })
    .eq("id", existing.employeeId)
    .is("deleted_at", null);

  if (employeeError) throw new Error(employeeError.message);

  await upsertEmployeeProfileRow(
    supabase,
    existing.employeeId,
    profile,
    emptyToNull(input.preferredName),
  );
  await upsertUserPreferences(supabase, profile, input.language, input.timezone);
  await upsertCurrentAddress(
    supabase,
    existing.employeeId,
    profile,
    input,
    existing.address.id,
  );
  await upsertEmergencyContact(
    supabase,
    existing.employeeId,
    profile,
    input,
    existing.emergencyContact.id,
  );
}
