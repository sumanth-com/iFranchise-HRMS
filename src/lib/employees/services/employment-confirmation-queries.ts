import { addMonths, differenceInCalendarDays, format, parseISO } from "date-fns";

import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { DEFAULT_LEAVE_PROBATION_RULES } from "@/lib/leave/services/leave-policy-engine";
import { hasAnyPermission } from "@/lib/permissions/utils";
import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import type {
  EmploymentConfirmationDetail,
  EmploymentConfirmationEvent,
  EmploymentConfirmationStatus,
  ProbationCandidate,
  ProbationCandidateStatus,
} from "@/types/employment-confirmation";

const CONFIRMATION_VIEW_PERMISSIONS = [
  "employee.view",
  "employee.edit",
  "performance.view",
  "payroll.view",
  PORTAL_PERMISSIONS.ceo,
  "system.admin.access",
] as const;

const APPROACHING_WINDOW_DAYS = 30;

/** PostgREST / schema-cache miss before migration is applied. */
function isMissingRelationError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const message = String(error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    (message.includes("employment_confirmations") &&
      (message.includes("schema cache") ||
        message.includes("does not exist") ||
        message.includes("could not find the table")))
  );
}

export function employmentConfirmationsMigrationRequiredMessage(): string {
  return (
    "Probation confirmations need database migration " +
    "20261016120000_employment_confirmations.sql applied " +
    "(table hrms.employment_confirmations)."
  );
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function todayIsoDate(asOf?: Date): string {
  const d = asOf ?? new Date();
  return format(d, "yyyy-MM-dd");
}

export function canViewEmploymentConfirmations(codes: string[]) {
  return hasAnyPermission(codes, [...CONFIRMATION_VIEW_PERMISSIONS]);
}

export function canManageEmploymentConfirmations(codes: string[]) {
  return hasAnyPermission(codes, [
    "employee.edit",
    "performance.edit",
    "payroll.edit",
    PORTAL_PERMISSIONS.ceo,
    "system.admin.access",
  ]);
}

async function loadProbationDurationMonths(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<number> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const settings = (data?.settings as Record<string, unknown> | null) ?? null;
  const leavePolicies = (settings?.leave_policies as Record<string, unknown> | undefined) ?? {};
  const probationRaw = (leavePolicies.probation as Record<string, unknown> | undefined) ?? {};
  const months = Number(probationRaw.duration_months);
  return Number.isFinite(months) && months > 0
    ? months
    : DEFAULT_LEAVE_PROBATION_RULES.durationMonths;
}

function isIsoDate(value: string | null | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10)));
}

/**
 * Prefer the employee's recorded probation end date (master/HR record), then
 * salary-structure components, then joining + org default duration as last resort.
 * Org-wide duration alone is wrong when some roles use 3 months and others 6.
 */
export function resolveProbationEndDate(
  joiningDate: string | null,
  durationMonths: number,
  options?: {
    employeeProbationEndDate?: string | null;
    componentsEndDate?: string | null;
    confirmationProbationEndDate?: string | null;
  },
): string | null {
  const preferred = [
    options?.confirmationProbationEndDate,
    options?.employeeProbationEndDate,
    options?.componentsEndDate,
  ];
  for (const value of preferred) {
    if (isIsoDate(value)) return value.slice(0, 10);
  }
  if (!joiningDate) return null;
  try {
    return format(addMonths(parseISO(joiningDate.slice(0, 10)), durationMonths), "yyyy-MM-dd");
  } catch {
    return null;
  }
}

function resolveCandidateStatus(input: {
  confirmationStatus: EmploymentConfirmationStatus | null;
  probationEndDate: string | null;
  today: string;
}): ProbationCandidateStatus {
  if (input.confirmationStatus === "confirmed") return "confirmed";
  if (input.confirmationStatus === "pending_review") return "pending_review";
  if (!input.probationEndDate) return "due";
  const days = differenceInCalendarDays(parseISO(input.probationEndDate), parseISO(input.today));
  if (days < 0) return "overdue";
  if (days === 0) return "due";
  if (days <= APPROACHING_WINDOW_DAYS) return "approaching";
  return "approaching";
}

export async function listProbationCandidates(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  options?: { asOf?: Date; includeUpcomingBeyondWindow?: boolean },
): Promise<ProbationCandidate[]> {
  const organizationId = profile.employee.organizationId;
  const today = todayIsoDate(options?.asOf);
  const durationMonths = await loadProbationDurationMonths(supabase, organizationId);

  const employeeSelectWithProbationEnd = `
        id,
        employee_code,
        first_name,
        last_name,
        employment_status,
        date_of_joining,
        probation_end_date,
        full_time_effective_date,
        designation_id,
        employment_type_id,
        designations:designation_id (id, title),
        employment_types:employment_type_id (id, name, code)
      `;
  const employeeSelectLegacy = `
        id,
        employee_code,
        first_name,
        last_name,
        employment_status,
        date_of_joining,
        full_time_effective_date,
        designation_id,
        employment_type_id,
        designations:designation_id (id, title),
        employment_types:employment_type_id (id, name, code)
      `;

  let employeesResult: {
    data: Array<Record<string, unknown>> | null;
    error: { message?: string; code?: string } | null;
  } = await supabase
    .schema("hrms")
    .from("employees")
    .select(employeeSelectWithProbationEnd)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .is("app_hidden_at", null)
    .in("employment_status", ["probation", "active"]);

  // Column may be missing until migration 20261016130000_employee_probation_end_date.
  if (
    employeesResult.error &&
    /probation_end_date/i.test(String(employeesResult.error.message ?? ""))
  ) {
    employeesResult = await supabase
      .schema("hrms")
      .from("employees")
      .select(employeeSelectLegacy)
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .is("app_hidden_at", null)
      .in("employment_status", ["probation", "active"]);
  }

  const confirmationsResult = await supabase
    .schema("hrms")
    .from("employment_confirmations")
    .select(
      `
        id,
        employee_id,
        confirmation_status,
        new_designation_id,
        new_gross_salary,
        effective_date,
        probation_end_date,
        designations:new_designation_id (title)
      `,
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .in("confirmation_status", ["pending_review", "confirmed"]);

  if (employeesResult.error) throw new Error(employeesResult.error.message);
  // Table may not exist until migration 20261016120000_employment_confirmations is applied.
  const confirmationsMissing = isMissingRelationError(confirmationsResult.error);
  if (confirmationsResult.error && !confirmationsMissing) {
    throw new Error(confirmationsResult.error.message);
  }

  const confirmationByEmployee = new Map<
    string,
    {
      id: string;
      status: EmploymentConfirmationStatus;
      proposedDesignationId: string | null;
      proposedDesignationTitle: string | null;
      proposedGrossSalary: number | null;
      proposedEffectiveDate: string | null;
      probationEndDate: string | null;
    }
  >();

  for (const row of confirmationsMissing ? [] : (confirmationsResult.data ?? [])) {
    const employeeId = String(row.employee_id);
    const existing = confirmationByEmployee.get(employeeId);
    const status = row.confirmation_status as EmploymentConfirmationStatus;
    // Prefer confirmed over pending; otherwise keep first pending.
    if (existing?.status === "confirmed") continue;
    if (status === "confirmed" || !existing) {
      const designation = unwrapRelation(
        row.designations as { title: string } | { title: string }[] | null,
      );
      confirmationByEmployee.set(employeeId, {
        id: String(row.id),
        status,
        proposedDesignationId: row.new_designation_id ? String(row.new_designation_id) : null,
        proposedDesignationTitle: designation?.title ?? null,
        proposedGrossSalary:
          row.new_gross_salary != null ? Number(row.new_gross_salary) : null,
        proposedEffectiveDate: row.effective_date
          ? String(row.effective_date).slice(0, 10)
          : null,
        probationEndDate: row.probation_end_date
          ? String(row.probation_end_date).slice(0, 10)
          : null,
      });
    }
  }

  const employeeIds = (employeesResult.data ?? []).map((row) => String(row.id));
  const salaryByEmployee = new Map<
    string,
    { gross: number; currency: string; componentsEnd: string | null }
  >();

  if (employeeIds.length > 0) {
    const { data: structures, error: structuresError } = await supabase
      .schema("hrms")
      .from("salary_structures")
      .select("employee_id, gross_salary, currency_code, effective_from, effective_to, components")
      .in("employee_id", employeeIds)
      .is("deleted_at", null)
      .lte("effective_from", today)
      .or(`effective_to.is.null,effective_to.gte.${today}`)
      .order("effective_from", { ascending: false });

    if (structuresError) throw new Error(structuresError.message);

    for (const row of structures ?? []) {
      const employeeId = String(row.employee_id);
      if (salaryByEmployee.has(employeeId)) continue;
      const components = (row.components as Record<string, unknown> | null) ?? null;
      const endFromComponents =
        typeof components?.probation_end_date === "string"
          ? String(components.probation_end_date).slice(0, 10)
          : null;
      salaryByEmployee.set(employeeId, {
        gross: Number(row.gross_salary ?? 0),
        currency: String(row.currency_code ?? "INR"),
        componentsEnd: endFromComponents,
      });
    }
  }

  const candidates: ProbationCandidate[] = [];

  for (const row of employeesResult.data ?? []) {
    const employmentType = unwrapRelation(
      row.employment_types as
        | { id: string; name: string; code: string }
        | { id: string; name: string; code: string }[]
        | null,
    );
    const designation = unwrapRelation(
      row.designations as { id: string; title: string } | { id: string; title: string }[] | null,
    );
    const typeCode = String(employmentType?.code ?? "").trim().toUpperCase();
    const isProbation =
      row.employment_status === "probation" || typeCode === "PROBATION";
    const confirmation = confirmationByEmployee.get(String(row.id)) ?? null;

    // Eligible: currently on probation, or has a confirmation record for audit.
    if (!isProbation && !confirmation) {
      continue;
    }

    const joining = row.date_of_joining ? String(row.date_of_joining).slice(0, 10) : null;
    const salary = salaryByEmployee.get(String(row.id));
    const employeeProbationEnd =
      "probation_end_date" in row && row.probation_end_date
        ? String(row.probation_end_date).slice(0, 10)
        : null;
    const probationEndDate = resolveProbationEndDate(joining, durationMonths, {
      confirmationProbationEndDate: confirmation?.probationEndDate ?? null,
      employeeProbationEndDate: employeeProbationEnd,
      componentsEndDate: salary?.componentsEnd ?? null,
    });

    const daysUntil =
      probationEndDate != null
        ? differenceInCalendarDays(parseISO(probationEndDate), parseISO(today))
        : null;

    // Hide far-future probationers unless already in review / confirmed.
    if (
      !options?.includeUpcomingBeyondWindow &&
      !confirmation &&
      daysUntil != null &&
      daysUntil > APPROACHING_WINDOW_DAYS
    ) {
      continue;
    }

    const candidateStatus = resolveCandidateStatus({
      confirmationStatus: confirmation?.status ?? null,
      probationEndDate,
      today,
    });

    candidates.push({
      employeeId: String(row.id),
      employeeCode: String(row.employee_code),
      employeeName: `${row.first_name} ${row.last_name}`.trim(),
      designationId: row.designation_id ? String(row.designation_id) : null,
      designationTitle: designation?.title ?? null,
      employmentTypeId: row.employment_type_id ? String(row.employment_type_id) : null,
      employmentTypeName: employmentType?.name ?? null,
      employmentStatus: String(row.employment_status),
      dateOfJoining: joining,
      probationEndDate,
      probationDurationMonths: durationMonths,
      currentGrossSalary: salary?.gross ?? null,
      currencyCode: salary?.currency ?? "INR",
      fullTimeEffectiveDate: row.full_time_effective_date
        ? String(row.full_time_effective_date).slice(0, 10)
        : null,
      confirmationId: confirmation?.id ?? null,
      confirmationStatus: confirmation?.status ?? null,
      proposedDesignationId: confirmation?.proposedDesignationId ?? null,
      proposedDesignationTitle: confirmation?.proposedDesignationTitle ?? null,
      proposedGrossSalary: confirmation?.proposedGrossSalary ?? null,
      proposedEffectiveDate: confirmation?.proposedEffectiveDate ?? null,
      candidateStatus,
      daysUntilProbationEnd: daysUntil,
    });
  }

  candidates.sort((a, b) => {
    const aDate = a.probationEndDate ?? "9999-12-31";
    const bDate = b.probationEndDate ?? "9999-12-31";
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return a.employeeName.localeCompare(b.employeeName);
  });

  return candidates;
}

export async function getEmploymentConfirmationDetail(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  confirmationId: string,
): Promise<EmploymentConfirmationDetail | null> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await supabase
    .schema("hrms")
    .from("employment_confirmations")
    .select(
      `
      id,
      employee_id,
      previous_designation_id,
      new_designation_id,
      previous_gross_salary,
      new_gross_salary,
      probation_end_date,
      effective_date,
      confirmation_status,
      notes,
      salary_structure_id,
      salary_revision_id,
      confirmed_at,
      employees:employee_id (employee_code, first_name, last_name),
      previous_designation:previous_designation_id (title),
      new_designation:new_designation_id (title)
    `,
    )
    .eq("id", confirmationId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const { data: events, error: eventsError } = await supabase
    .schema("hrms")
    .from("employment_confirmation_events")
    .select("id, event_type, actor_user_id, payload, created_at")
    .eq("confirmation_id", confirmationId)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (eventsError && !isMissingRelationError(eventsError)) {
    throw new Error(eventsError.message);
  }

  const employee = unwrapRelation(
    data.employees as
      | { employee_code: string; first_name: string; last_name: string }
      | { employee_code: string; first_name: string; last_name: string }[]
      | null,
  );
  const prevDesig = unwrapRelation(
    data.previous_designation as { title: string } | { title: string }[] | null,
  );
  const nextDesig = unwrapRelation(
    data.new_designation as { title: string } | { title: string }[] | null,
  );

  const mappedEvents: EmploymentConfirmationEvent[] = (events ?? []).map(
    (row: {
      id: string;
      event_type: string;
      actor_user_id: string | null;
      payload: unknown;
      created_at: string;
    }) => ({
      id: String(row.id),
      eventType: String(row.event_type),
      actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
      payload: (row.payload as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at),
    }),
  );

  return {
    id: String(data.id),
    employeeId: String(data.employee_id),
    employeeCode: employee?.employee_code ?? "",
    employeeName: employee
      ? `${employee.first_name} ${employee.last_name}`.trim()
      : "",
    previousDesignationId: data.previous_designation_id
      ? String(data.previous_designation_id)
      : null,
    previousDesignationTitle: prevDesig?.title ?? null,
    newDesignationId: data.new_designation_id ? String(data.new_designation_id) : null,
    newDesignationTitle: nextDesig?.title ?? null,
    previousGrossSalary:
      data.previous_gross_salary != null ? Number(data.previous_gross_salary) : null,
    newGrossSalary: Number(data.new_gross_salary),
    probationEndDate: data.probation_end_date
      ? String(data.probation_end_date).slice(0, 10)
      : null,
    effectiveDate: String(data.effective_date).slice(0, 10),
    confirmationStatus: data.confirmation_status as EmploymentConfirmationStatus,
    notes: data.notes ? String(data.notes) : null,
    salaryStructureId: data.salary_structure_id ? String(data.salary_structure_id) : null,
    salaryRevisionId: data.salary_revision_id ? String(data.salary_revision_id) : null,
    confirmedAt: data.confirmed_at ? String(data.confirmed_at) : null,
    events: mappedEvents,
  };
}
