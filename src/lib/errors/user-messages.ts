type PostgresErrorShape = {
  code?: string;
  message?: string;
  details?: string;
};

const DUPLICATE_PAYROLL_ITEM =
  /payroll_items_unique_per_employee|duplicate key value violates unique constraint/i;
const RLS_VIOLATION =
  /row-level security policy|new row violates|violat(es|ing) row-level|42501/i;
const DUPLICATE_KEY = /duplicate key value violates unique constraint/i;

export function isRowLevelSecurityError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code === "42501") return true;
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String((error as { message?: string } | null)?.message ?? "");
  return RLS_VIOLATION.test(raw);
}

export function toUserFriendlyError(
  error: unknown,
  fallback = "Something went wrong. Please try again or contact support if the issue persists.",
): string {
  if (typeof error === "string") {
    error = new Error(error);
  }

  if (!(error instanceof Error)) {
    return fallback;
  }

  const raw = error.message.trim();
  if (!raw) return fallback;

  const pg = error as Error & PostgresErrorShape;

  if (/employee_profiles_dob_valid/i.test(raw)) {
    return "Date of birth cannot be in the future. Please choose a valid date.";
  }

  if (/employee_addresses_type_primary_per_employee/i.test(raw)) {
    return "We could not save the employee address. Refresh the page and try again.";
  }

  if (/violates check constraint/i.test(raw)) {
    return "Some of the entered values are not allowed. Please review the form and try again.";
  }

  if (pg.code === "23505" || DUPLICATE_PAYROLL_ITEM.test(raw)) {
    if (DUPLICATE_PAYROLL_ITEM.test(raw)) {
      return "Payroll for the selected period has already been generated. Open Company Payroll to review the existing run.";
    }
    return "This record already exists. Please review the existing entry before saving again.";
  }

  if (pg.code === "42501" || isRowLevelSecurityError(error)) {
    return "You do not have permission to perform this action. Contact your administrator if you need access.";
  }

  if (DUPLICATE_KEY.test(raw)) {
    return "This record already exists. Please review the existing entry before saving again.";
  }

  if (error.name === "PayrollIntegrityError") {
    return raw;
  }

  if (/not authenticated/i.test(raw)) {
    return "Your session has expired. Please sign in again.";
  }

  if (/network error|failed to fetch|load failed|fetch failed/i.test(raw)) {
    return "Connection lost. Refresh the page and try again.";
  }

  if (/violates foreign key constraint/i.test(raw)) {
    return "This action cannot be completed because related records depend on it.";
  }

  if (/invalid input syntax for type date/i.test(raw)) {
    return "Please enter a valid date and try again.";
  }

  if (error.name === "ZodError" || /invalid_type|too_small|too_big/i.test(raw)) {
    return "Some of the entered values are invalid. Please review the form and try again.";
  }

  if (/permission to delete attendance/i.test(raw)) {
    return "You do not have permission to delete attendance records.";
  }

  if (/already been generated|already been submitted|already exists/i.test(raw)) {
    return raw;
  }

  if (/^Failed to |^Unable to /i.test(raw) && raw.length < 160) {
    return raw;
  }

  if (
    /postgres|supabase|pgrst|schema cache|SQLSTATE|relation .* does not exist/i.test(raw)
  ) {
    return fallback;
  }

  if (raw.length > 180) {
    return fallback;
  }

  return raw;
}
