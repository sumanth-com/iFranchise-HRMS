import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { z } from "zod";
import {
  branchFormSchema,
  departmentFormSchema,
  designationFormSchema,
  employmentTypeFormSchema,
  holidayFormSchema,
  organizationProfileSchema,
  shiftTemplateFormSchema,
  workLocationFormSchema,
} from "@/lib/validations/organization";
import { emptyToNull } from "@/lib/organization/services/org-lookups";
import { wouldCreateCircularReporting } from "@/lib/organization/services/org-queries";

type ProfileInput = z.infer<typeof organizationProfileSchema>;
type BranchInput = z.infer<typeof branchFormSchema>;
type DepartmentInput = z.infer<typeof departmentFormSchema>;
type DesignationInput = z.infer<typeof designationFormSchema>;
type EmploymentTypeInput = z.infer<typeof employmentTypeFormSchema>;
type WorkLocationInput = z.infer<typeof workLocationFormSchema>;
type HolidayInput = z.infer<typeof holidayFormSchema>;
type ShiftInput = z.infer<typeof shiftTemplateFormSchema>;

function auditFields(profile: UserProfile) {
  return { updated_by: profile.userId, updated_at: new Date().toISOString() };
}

function createFields(profile: UserProfile) {
  return {
    organization_id: profile.employee.organizationId,
    created_by: profile.userId,
    updated_by: profile.userId,
  };
}

export async function updateOrganizationProfile(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ProfileInput,
) {
  const parsed = organizationProfileSchema.parse(input);
  const orgId = profile.employee.organizationId;

  const { error: orgError } = await supabase
    .schema("hrms")
    .from("organizations")
    .update({
      name: parsed.name,
      legal_name: emptyToNull(parsed.legalName),
      email: emptyToNull(parsed.email),
      phone: emptyToNull(parsed.phone),
      website: emptyToNull(parsed.website),
      gst_number: emptyToNull(parsed.gstNumber),
      pan_number: emptyToNull(parsed.panNumber),
      cin: emptyToNull(parsed.cin),
      registered_address_line1: emptyToNull(parsed.registeredAddressLine1),
      registered_address_line2: emptyToNull(parsed.registeredAddressLine2),
      registered_city: emptyToNull(parsed.registeredCity),
      registered_state: emptyToNull(parsed.registeredState),
      registered_country: emptyToNull(parsed.registeredCountry) ?? "IN",
      registered_postal_code: emptyToNull(parsed.registeredPostalCode),
      corporate_address_line1: emptyToNull(parsed.corporateAddressLine1),
      corporate_address_line2: emptyToNull(parsed.corporateAddressLine2),
      corporate_city: emptyToNull(parsed.corporateCity),
      corporate_state: emptyToNull(parsed.corporateState),
      corporate_country: emptyToNull(parsed.corporateCountry) ?? "IN",
      corporate_postal_code: emptyToNull(parsed.corporatePostalCode),
      ...auditFields(profile),
    })
    .eq("id", orgId);

  if (orgError) throw new Error(orgError.message);

  const { error: settingsError } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .update({
      timezone: parsed.timezone,
      currency_code: parsed.currencyCode,
      date_format: parsed.dateFormat,
      fiscal_year_start_month: parsed.fiscalYearStartMonth,
      ...auditFields(profile),
    })
    .eq("organization_id", orgId);

  if (settingsError) throw new Error(settingsError.message);
}

async function assertUniqueDepartmentName(
  supabase: AuthSupabaseClient,
  orgId: string,
  name: string,
  excludeId?: string,
) {
  let query = supabase
    .schema("hrms")
    .from("departments")
    .select("id")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .ilike("name", name.trim());

  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.limit(1);
  if (data?.length) throw new Error("A department with this name already exists");
}

async function assertUniqueDesignationTitle(
  supabase: AuthSupabaseClient,
  orgId: string,
  title: string,
  excludeId?: string,
) {
  let query = supabase
    .schema("hrms")
    .from("designations")
    .select("id")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .ilike("title", title.trim());

  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.limit(1);
  if (data?.length) throw new Error("A designation with this title already exists");
}

async function assertUniqueBranchCode(
  supabase: AuthSupabaseClient,
  orgId: string,
  code: string,
  excludeId?: string,
) {
  let query = supabase
    .schema("hrms")
    .from("branches")
    .select("id")
    .eq("organization_id", orgId)
    .is("deleted_at", null)
    .ilike("code", code.trim());

  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query.limit(1);
  if (data?.length) throw new Error("A branch with this code already exists");
}

export async function saveBranch(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: BranchInput,
  id?: string,
) {
  const parsed = branchFormSchema.parse(input);
  const orgId = profile.employee.organizationId;
  await assertUniqueBranchCode(supabase, orgId, parsed.code, id);

  const payload = {
    code: parsed.code.toUpperCase(),
    name: parsed.name,
    location: emptyToNull(parsed.location),
    address_line1: emptyToNull(parsed.addressLine1),
    address_line2: emptyToNull(parsed.addressLine2),
    city: emptyToNull(parsed.city),
    state: emptyToNull(parsed.state),
    postal_code: emptyToNull(parsed.postalCode),
    country: parsed.country,
    phone: emptyToNull(parsed.phone),
    email: emptyToNull(parsed.email),
    branch_head_id: parsed.branchHeadId ?? null,
    is_head_office: parsed.isHeadOffice,
    status: parsed.status,
    ...auditFields(profile),
  };

  if (id) {
    const { error } = await supabase.schema("hrms").from("branches").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("branches")
    .insert({ ...payload, ...createFields(profile) })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteBranch(supabase: AuthSupabaseClient, profile: UserProfile, id: string) {
  const orgId = profile.employee.organizationId;
  const { count } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("branch_id", id)
    .is("deleted_at", null);

  if ((count ?? 0) > 0) {
    throw new Error("Cannot delete branch with assigned employees");
  }

  const { error } = await supabase
    .schema("hrms")
    .from("branches")
    .update({ deleted_at: new Date().toISOString(), status: "archived", ...auditFields(profile) })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function saveDepartment(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: DepartmentInput,
  id?: string,
) {
  const parsed = departmentFormSchema.parse(input);
  const orgId = profile.employee.organizationId;
  await assertUniqueDepartmentName(supabase, orgId, parsed.name, id);

  if (parsed.parentDepartmentId === id) {
    throw new Error("Department cannot be its own parent");
  }

  const payload = {
    name: parsed.name,
    code: parsed.code.toUpperCase(),
    description: emptyToNull(parsed.description),
    department_head_id: parsed.departmentHeadId ?? null,
    parent_department_id: parsed.parentDepartmentId ?? null,
    branch_id: parsed.branchId ?? null,
    status: parsed.status,
    ...auditFields(profile),
  };

  if (id) {
    const { error } = await supabase.schema("hrms").from("departments").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("departments")
    .insert({ ...payload, ...createFields(profile) })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteDepartment(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  id: string,
) {
  const orgId = profile.employee.organizationId;
  const { count } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("department_id", id)
    .is("deleted_at", null);

  if ((count ?? 0) > 0) {
    throw new Error("Cannot delete department with assigned employees");
  }

  const { error } = await supabase
    .schema("hrms")
    .from("departments")
    .update({ deleted_at: new Date().toISOString(), status: "archived", ...auditFields(profile) })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function saveDesignation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: DesignationInput,
  id?: string,
) {
  const parsed = designationFormSchema.parse(input);
  const orgId = profile.employee.organizationId;
  await assertUniqueDesignationTitle(supabase, orgId, parsed.title, id);

  const payload = {
    title: parsed.title,
    code: parsed.code.toUpperCase(),
    department_id: parsed.departmentId ?? null,
    level: parsed.level,
    description: emptyToNull(parsed.description),
    status: parsed.status,
    ...auditFields(profile),
  };

  if (id) {
    const { error } = await supabase.schema("hrms").from("designations").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("designations")
    .insert({ ...payload, ...createFields(profile) })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteDesignation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  id: string,
) {
  const orgId = profile.employee.organizationId;
  const { count } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("designation_id", id)
    .is("deleted_at", null);

  if ((count ?? 0) > 0) {
    throw new Error("Cannot delete designation currently assigned to employees");
  }

  const { error } = await supabase
    .schema("hrms")
    .from("designations")
    .update({ deleted_at: new Date().toISOString(), status: "archived", ...auditFields(profile) })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function saveEmploymentType(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: EmploymentTypeInput,
  id?: string,
) {
  const parsed = employmentTypeFormSchema.parse(input);

  const payload = {
    name: parsed.name,
    code: parsed.code.toUpperCase(),
    description: emptyToNull(parsed.description),
    is_full_time: parsed.isFullTime,
    default_hours_per_week: parsed.defaultHoursPerWeek,
    status: parsed.status,
    ...auditFields(profile),
  };

  if (id) {
    const { error } = await supabase.schema("hrms").from("employment_types").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("employment_types")
    .insert({ ...payload, ...createFields(profile) })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteEmploymentType(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  id: string,
) {
  const orgId = profile.employee.organizationId;
  const { count } = await supabase
    .schema("hrms")
    .from("employees")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("employment_type_id", id)
    .is("deleted_at", null);

  if ((count ?? 0) > 0) {
    throw new Error("Cannot delete employment type assigned to employees");
  }

  const { error } = await supabase
    .schema("hrms")
    .from("employment_types")
    .update({ deleted_at: new Date().toISOString(), status: "archived", ...auditFields(profile) })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function saveWorkLocation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: WorkLocationInput,
  id?: string,
) {
  const parsed = workLocationFormSchema.parse(input);

  const payload = {
    branch_id: parsed.branchId,
    name: parsed.name,
    working_days: parsed.workingDays,
    office_start_time: parsed.officeStartTime,
    office_end_time: parsed.officeEndTime,
    latitude: parsed.latitude ?? null,
    longitude: parsed.longitude ?? null,
    status: parsed.status,
    ...auditFields(profile),
  };

  if (id) {
    const { error } = await supabase.schema("hrms").from("work_locations").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("work_locations")
    .insert({ ...payload, ...createFields(profile) })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteWorkLocation(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  id: string,
) {
  const { error } = await supabase
    .schema("hrms")
    .from("work_locations")
    .update({ deleted_at: new Date().toISOString(), status: "archived", ...auditFields(profile) })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function saveHoliday(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: HolidayInput,
  id?: string,
) {
  const parsed = holidayFormSchema.parse(input);

  const payload = {
    name: parsed.name,
    holiday_date: parsed.holidayDate,
    holiday_type: parsed.holidayType,
    branch_id: parsed.branchId ?? null,
    is_optional: parsed.isOptional,
    is_recurring: parsed.isRecurring,
    recurring_month: parsed.isRecurring ? parsed.recurringMonth : null,
    recurring_day: parsed.isRecurring ? parsed.recurringDay : null,
    applicable_department_ids: parsed.applicableDepartmentIds,
    description: emptyToNull(parsed.description),
    status: parsed.status,
    ...auditFields(profile),
  };

  if (id) {
    const { error } = await supabase.schema("hrms").from("holidays").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("holidays")
    .insert({ ...payload, ...createFields(profile) })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteHoliday(supabase: AuthSupabaseClient, profile: UserProfile, id: string) {
  const { error } = await supabase
    .schema("hrms")
    .from("holidays")
    .update({ deleted_at: new Date().toISOString(), status: "archived", ...auditFields(profile) })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function saveShiftTemplate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ShiftInput,
  id?: string,
) {
  const parsed = shiftTemplateFormSchema.parse(input);

  const payload = {
    name: parsed.name,
    start_time: parsed.startTime,
    end_time: parsed.endTime,
    break_duration_minutes: parsed.breakDurationMinutes,
    grace_time_minutes: parsed.graceTimeMinutes,
    minimum_hours: parsed.minimumHours,
    half_day_hours: parsed.halfDayHours,
    status: parsed.status,
    ...auditFields(profile),
  };

  if (id) {
    const { error } = await supabase.schema("hrms").from("shift_templates").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return id;
  }

  const { data, error } = await supabase
    .schema("hrms")
    .from("shift_templates")
    .insert({ ...payload, ...createFields(profile) })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function deleteShiftTemplate(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  id: string,
) {
  const { error } = await supabase
    .schema("hrms")
    .from("shift_templates")
    .update({ deleted_at: new Date().toISOString(), status: "archived", ...auditFields(profile) })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function updateReportingManager(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  employeeId: string,
  reportingManagerId: string | null,
) {
  const circular = await wouldCreateCircularReporting(supabase, employeeId, reportingManagerId);
  if (circular) {
    throw new Error("This assignment would create a circular reporting hierarchy");
  }

  const { error } = await supabase
    .schema("hrms")
    .from("employees")
    .update({ reporting_manager_id: reportingManagerId, ...auditFields(profile) })
    .eq("id", employeeId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function importHolidaysFromCsv(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  csvContent: string,
) {
  const lines = csvContent.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const dateIdx = headers.indexOf("date");
  const typeIdx = headers.indexOf("type");

  if (nameIdx === -1 || dateIdx === -1) {
    throw new Error("CSV must include 'name' and 'date' columns");
  }

  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[nameIdx];
    const date = cols[dateIdx];
    if (!name || !date) continue;

    const type = typeIdx >= 0 ? cols[typeIdx]?.toLowerCase() : "company";
    const holidayType = ["national", "state", "company"].includes(type)
      ? (type as "national" | "state" | "company")
      : "company";

    await saveHoliday(supabase, profile, {
      name,
      holidayDate: date,
      holidayType,
      branchId: null,
      isOptional: false,
      isRecurring: false,
      recurringMonth: null,
      recurringDay: null,
      applicableDepartmentIds: [],
      description: null,
      status: "active",
    });
    imported += 1;
  }

  return imported;
}
