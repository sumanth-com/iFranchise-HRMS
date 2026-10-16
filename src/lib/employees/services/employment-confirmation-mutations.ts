import { format } from "date-fns";

import {
  canManageEmploymentConfirmations,
  employmentConfirmationsMigrationRequiredMessage,
} from "@/lib/employees/services/employment-confirmation-queries";
import { resolveLeaveEligibilityBand } from "@/lib/leave/leave-eligibility";
import { createSalaryRevision } from "@/lib/payroll/services/payroll-mutations";
import { salaryBreakdownToStructureFields } from "@/lib/payroll/salary-structure-breakdown";
import { saveDesignation } from "@/lib/organization/services/org-mutations";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type { EmploymentConfirmationStatus } from "@/types/employment-confirmation";
import {
  employmentConfirmationConfirmSchema,
  employmentConfirmationDraftSchema,
  type EmploymentConfirmationDraftInput,
} from "@/lib/validations/employment-confirmation";

function isMissingRelationError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (message.includes("employment_confirmation") &&
      (message.includes("schema cache") ||
        message.includes("does not exist") ||
        message.includes("could not find the table")))
  );
}

function throwIfMissingRelation(error: { message?: string; code?: string } | null) {
  if (isMissingRelationError(error)) {
    throw new Error(employmentConfirmationsMigrationRequiredMessage());
  }
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function assertCanManage(profile: UserProfile) {
  if (!canManageEmploymentConfirmations(profile.permissionCodes)) {
    throw new Error("You do not have permission to manage probation confirmations.");
  }
}

async function appendConfirmationEvent(
  supabase: AuthSupabaseClient,
  input: {
    organizationId: string;
    confirmationId: string;
    eventType: string;
    actorUserId: string;
    payload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.schema("hrms").from("employment_confirmation_events").insert({
    organization_id: input.organizationId,
    confirmation_id: input.confirmationId,
    event_type: input.eventType,
    actor_user_id: input.actorUserId,
    payload: input.payload ?? {},
  });
  if (error) {
    throwIfMissingRelation(error);
    throw new Error(error.message);
  }
}

async function loadFullTimeEmploymentTypeId(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<string> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("employment_types")
    .select("id, code")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  const match = (data ?? []).find(
    (row: { id: string; code: string | null }) =>
      String(row.code ?? "").trim().toUpperCase() === "FULL_TIME",
  );
  if (!match) {
    throw new Error("Full-time employment type is not configured for this organization.");
  }
  return String(match.id);
}

async function loadCurrentGrossSalary(
  supabase: AuthSupabaseClient,
  employeeId: string,
  asOf: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("salary_structures")
    .select("gross_salary, effective_from")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .lte("effective_from", asOf)
    .or(`effective_to.is.null,effective_to.gte.${asOf}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return Number(data.gross_salary ?? 0);
}

async function assertNoDuplicateConfirmed(
  supabase: AuthSupabaseClient,
  employeeId: string,
  excludeId?: string,
) {
  let query = supabase
    .schema("hrms")
    .from("employment_confirmations")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("confirmation_status", "confirmed")
    .is("deleted_at", null)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throwIfMissingRelation(error);
    throw new Error(error.message);
  }
  if (data) {
    throw new Error("This employee already has a confirmed full-time confirmation on record.");
  }
}

/**
 * Resolve an existing designation by id/title, or create a new active designation
 * so it is reusable in profiles, directory, provisioning, and future forms.
 */
async function resolveOrCreateDesignationId(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: Pick<EmploymentConfirmationDraftInput, "newDesignationId" | "newDesignationTitle">,
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const title = input.newDesignationTitle?.trim() ?? "";

  if (input.newDesignationId) {
    const { data, error } = await supabase
      .schema("hrms")
      .from("designations")
      .select("id, title")
      .eq("id", input.newDesignationId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Selected designation was not found.");
    return String(data.id);
  }

  if (!title) {
    throw new Error("Full-time designation is required.");
  }

  const { data: existing, error: existingError } = await supabase
    .schema("hrms")
    .from("designations")
    .select("id, title")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .ilike("title", title)
    .limit(5);

  if (existingError) throw new Error(existingError.message);

  const exact = (existing ?? []).find(
    (row: { id: string; title: string }) =>
      String(row.title).trim().toLowerCase() === title.toLowerCase(),
  );
  if (exact) return String(exact.id);

  return saveDesignation(supabase, profile, {
    title,
    status: "active",
  });
}

export async function saveEmploymentConfirmationDraft(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<{ confirmationId: string }> {
  assertCanManage(profile);
  const parsed = employmentConfirmationDraftSchema.parse(input);
  const organizationId = profile.employee.organizationId;
  const newDesignationId = await resolveOrCreateDesignationId(supabase, profile, parsed);

  const { data: employee, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      "id, designation_id, employment_type_id, employment_status, full_time_effective_date, organization_id",
    )
    .eq("id", parsed.employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found.");

  await assertNoDuplicateConfirmed(supabase, parsed.employeeId, parsed.confirmationId);

  const currentGross = await loadCurrentGrossSalary(
    supabase,
    parsed.employeeId,
    parsed.effectiveDate,
  );

  const payload = {
    organization_id: organizationId,
    employee_id: parsed.employeeId,
    previous_designation_id: employee.designation_id,
    new_designation_id: newDesignationId,
    previous_employment_type_id: employee.employment_type_id,
    previous_gross_salary: currentGross,
    new_gross_salary: parsed.newGrossSalary,
    probation_end_date: parsed.probationEndDate ?? null,
    effective_date: parsed.effectiveDate,
    confirmation_status: "pending_review" as EmploymentConfirmationStatus,
    notes: parsed.notes?.trim() || null,
    updated_by: profile.userId,
  };

  if (parsed.confirmationId) {
    const { data: existing, error: existingError } = await supabase
      .schema("hrms")
      .from("employment_confirmations")
      .select("id, confirmation_status, employee_id")
      .eq("id", parsed.confirmationId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("Confirmation draft not found.");
    if (existing.confirmation_status === "confirmed") {
      throw new Error("Confirmed records cannot be edited. Create a salary revision instead.");
    }
    if (String(existing.employee_id) !== parsed.employeeId) {
      throw new Error("Confirmation employee mismatch.");
    }

    const { error: updateError } = await supabase
      .schema("hrms")
      .from("employment_confirmations")
      .update(payload)
      .eq("id", parsed.confirmationId);

    if (updateError) {
      throwIfMissingRelation(updateError);
      throw new Error(updateError.message);
    }

    await appendConfirmationEvent(supabase, {
      organizationId,
      confirmationId: parsed.confirmationId,
      eventType: "updated",
      actorUserId: profile.userId,
      payload: {
        effectiveDate: parsed.effectiveDate,
        newGrossSalary: parsed.newGrossSalary,
        newDesignationId,
      },
    });

    return { confirmationId: parsed.confirmationId };
  }

  const { data: inserted, error: insertError } = await supabase
    .schema("hrms")
    .from("employment_confirmations")
    .insert({
      ...payload,
      created_by: profile.userId,
    })
    .select("id")
    .single();

  if (insertError) {
    throwIfMissingRelation(insertError);
    throw new Error(insertError.message);
  }

  await appendConfirmationEvent(supabase, {
    organizationId,
    confirmationId: String(inserted.id),
    eventType: "created",
    actorUserId: profile.userId,
    payload: {
      effectiveDate: parsed.effectiveDate,
      newGrossSalary: parsed.newGrossSalary,
      newDesignationId,
    },
  });

  return { confirmationId: String(inserted.id) };
}

/**
 * Confirm probation → full-time:
 * - Sets full_time_effective_date (never changes date_of_joining)
 * - Updates designation + employment type/status
 * - Creates effective-dated salary structure via existing revision flow
 * - Refreshes only unlocked eligible payroll via createSalaryRevision → syncPayrollAfterSalaryChange
 */
export async function confirmEmploymentToFullTime(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: unknown,
): Promise<{ confirmationId: string; salaryRevisionId: string }> {
  assertCanManage(profile);
  const parsed = employmentConfirmationConfirmSchema.parse(input);
  const organizationId = profile.employee.organizationId;
  const newDesignationId = await resolveOrCreateDesignationId(supabase, profile, parsed);

  await assertNoDuplicateConfirmed(supabase, parsed.employeeId, parsed.confirmationId);

  const { data: employee, error: employeeError } = await supabase
    .schema("hrms")
    .from("employees")
    .select(
      `
      id,
      employee_code,
      first_name,
      last_name,
      designation_id,
      employment_type_id,
      employment_status,
      full_time_effective_date,
      date_of_joining,
      employment_types:employment_type_id (code, is_full_time)
    `,
    )
    .eq("id", parsed.employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) throw new Error("Employee not found.");

  if (employee.full_time_effective_date && employee.employment_status === "active") {
    const type = unwrapRelation(
      employee.employment_types as
        | { code: string; is_full_time: boolean | null }
        | { code: string; is_full_time: boolean | null }[]
        | null,
    );
    if (String(type?.code ?? "").toUpperCase() === "FULL_TIME") {
      throw new Error(
        "This employee is already confirmed full-time. Duplicate confirmation is not allowed.",
      );
    }
  }

  const fullTimeTypeId = await loadFullTimeEmploymentTypeId(supabase, organizationId);
  const currentGross = await loadCurrentGrossSalary(
    supabase,
    parsed.employeeId,
    parsed.effectiveDate,
  );

  let confirmationId = parsed.confirmationId ?? null;

  if (confirmationId) {
    const { data: existing, error: existingError } = await supabase
      .schema("hrms")
      .from("employment_confirmations")
      .select("id, confirmation_status")
      .eq("id", confirmationId)
      .eq("organization_id", organizationId)
      .eq("employee_id", parsed.employeeId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("Confirmation record not found.");
    if (existing.confirmation_status === "confirmed") {
      throw new Error("This confirmation has already been applied.");
    }

    const { error: updateError } = await supabase
      .schema("hrms")
      .from("employment_confirmations")
      .update({
        previous_designation_id: employee.designation_id,
        new_designation_id: newDesignationId,
        previous_employment_type_id: employee.employment_type_id,
        new_employment_type_id: fullTimeTypeId,
        previous_gross_salary: currentGross,
        new_gross_salary: parsed.newGrossSalary,
        probation_end_date: parsed.probationEndDate ?? null,
        effective_date: parsed.effectiveDate,
        notes: parsed.notes?.trim() || null,
        updated_by: profile.userId,
      })
      .eq("id", confirmationId);

    if (updateError) {
      throwIfMissingRelation(updateError);
      throw new Error(updateError.message);
    }
  } else {
    const draft = await saveEmploymentConfirmationDraft(supabase, profile, {
      ...parsed,
      newDesignationId,
      newDesignationTitle: null,
      confirmationId: undefined,
    });
    confirmationId = draft.confirmationId;

    const { error: typeUpdateError } = await supabase
      .schema("hrms")
      .from("employment_confirmations")
      .update({
        new_employment_type_id: fullTimeTypeId,
        updated_by: profile.userId,
      })
      .eq("id", confirmationId);

    if (typeUpdateError) throw new Error(typeUpdateError.message);
  }

  const split = salaryBreakdownToStructureFields(parsed.newGrossSalary);
  const salaryRevisionId = await createSalaryRevision(supabase, profile, {
    employeeId: parsed.employeeId,
    effectiveFrom: parsed.effectiveDate,
    employmentTypeId: fullTimeTypeId,
    currencyCode: "INR",
    basicSalary: split.basicSalary,
    hraAmount: split.hraAmount,
    transportAllowance: split.transportAllowance,
    otherAllowances: 0,
    components: {
      specialAllowance: split.specialAllowance,
      medical: 0,
      pf: 0,
      esi: 0,
      professionalTax: 0,
      incomeTax: 0,
      other: 0,
    },
    reason: `Probation confirmation effective ${parsed.effectiveDate}`,
  });

  const { data: revisionRow, error: revisionLookupError } = await supabase
    .schema("hrms")
    .from("salary_revisions")
    .select("new_structure_id")
    .eq("id", salaryRevisionId)
    .maybeSingle();

  if (revisionLookupError) throw new Error(revisionLookupError.message);

  const nextBand = resolveLeaveEligibilityBand({
    employmentStatus: "active",
    employmentTypeCode: "FULL_TIME",
    isFullTime: true,
  });
  const fullTimeEffectiveDate =
    nextBand === "full_time_confirmed"
      ? employee.full_time_effective_date
        ? String(employee.full_time_effective_date).slice(0, 10)
        : parsed.effectiveDate
      : parsed.effectiveDate;

  const employeeUpdatePayload: Record<string, unknown> = {
    designation_id: newDesignationId,
    employment_type_id: fullTimeTypeId,
    employment_status: "active",
    full_time_effective_date: fullTimeEffectiveDate,
    updated_by: profile.userId,
  };
  if (parsed.probationEndDate) {
    employeeUpdatePayload.probation_end_date = parsed.probationEndDate;
  }

  let { error: employeeUpdateError } = await supabase
    .schema("hrms")
    .from("employees")
    .update(employeeUpdatePayload)
    .eq("id", parsed.employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  // Soft-fallback before probation_end_date column is migrated.
  if (
    employeeUpdateError &&
    /probation_end_date/i.test(String(employeeUpdateError.message ?? ""))
  ) {
    const { probation_end_date: _, ...legacyPayload } = employeeUpdatePayload;
    void _;
    const retry = await supabase
      .schema("hrms")
      .from("employees")
      .update(legacyPayload)
      .eq("id", parsed.employeeId)
      .eq("organization_id", organizationId)
      .is("deleted_at", null);
    employeeUpdateError = retry.error;
  }

  if (employeeUpdateError) throw new Error(employeeUpdateError.message);

  // Keep salary-structure components in sync so profiles/directory/leave read the same end date.
  if (parsed.probationEndDate) {
    const { data: currentStructure } = await supabase
      .schema("hrms")
      .from("salary_structures")
      .select("id, components")
      .eq("employee_id", parsed.employeeId)
      .is("deleted_at", null)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentStructure?.id) {
      const components = {
        ...((currentStructure.components as Record<string, unknown> | null) ?? {}),
        probation_end_date: parsed.probationEndDate,
      };
      await supabase
        .schema("hrms")
        .from("salary_structures")
        .update({ components, updated_by: profile.userId })
        .eq("id", currentStructure.id);
    }
  }

  const nowIso = new Date().toISOString();
  const { error: confirmUpdateError } = await supabase
    .schema("hrms")
    .from("employment_confirmations")
    .update({
      confirmation_status: "confirmed",
      salary_structure_id: revisionRow?.new_structure_id ?? null,
      salary_revision_id: salaryRevisionId,
      confirmed_by: profile.userId,
      confirmed_at: nowIso,
      updated_by: profile.userId,
    })
    .eq("id", confirmationId);

  if (confirmUpdateError) {
    // Unique index race → surface as duplicate protection
    if (confirmUpdateError.code === "23505") {
      throw new Error("This employee already has a confirmed full-time confirmation on record.");
    }
    throwIfMissingRelation(confirmUpdateError);
    throw new Error(confirmUpdateError.message);
  }

  await appendConfirmationEvent(supabase, {
    organizationId,
    confirmationId,
    eventType: "confirmed",
    actorUserId: profile.userId,
    payload: {
      effectiveDate: parsed.effectiveDate,
      newGrossSalary: parsed.newGrossSalary,
      newDesignationId,
      salaryRevisionId,
      confirmedAt: nowIso,
      fullTimeEffectiveDate,
      joiningDatePreserved: employee.date_of_joining
        ? String(employee.date_of_joining).slice(0, 10)
        : null,
    },
  });

  return { confirmationId, salaryRevisionId };
}

export async function cancelEmploymentConfirmationDraft(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  confirmationId: string,
): Promise<void> {
  assertCanManage(profile);
  const organizationId = profile.employee.organizationId;

  const { data: existing, error } = await supabase
    .schema("hrms")
    .from("employment_confirmations")
    .select("id, confirmation_status")
    .eq("id", confirmationId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!existing) throw new Error("Confirmation not found.");
  if (existing.confirmation_status === "confirmed") {
    throw new Error("Confirmed records cannot be cancelled.");
  }

  const { error: updateError } = await supabase
    .schema("hrms")
    .from("employment_confirmations")
    .update({
      confirmation_status: "cancelled",
      deleted_at: format(new Date(), "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"),
      updated_by: profile.userId,
    })
    .eq("id", confirmationId);

  if (updateError) throw new Error(updateError.message);

  await appendConfirmationEvent(supabase, {
    organizationId,
    confirmationId,
    eventType: "cancelled",
    actorUserId: profile.userId,
  });
}
