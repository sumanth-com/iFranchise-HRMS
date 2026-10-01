import { isFormerEmploymentStatus } from "@/lib/employees/employment-eligibility";
import { isIsoDateNotAfterToday } from "@/lib/validations/date";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD, or empty when the value is blank or not a calendar date. */
export function normalizeEmployeeExitDate(value: string | null | undefined): string {
  const day = value?.trim().slice(0, 10) ?? "";
  return ISO_DATE.test(day) ? day : "";
}

/** Returns a user-facing error, or null when the exit date can be saved. */
export function employeeExitDateError(
  exitDate: string,
  dateOfJoining: string | null | undefined,
): string | null {
  const day = normalizeEmployeeExitDate(exitDate);
  if (!day) return "Enter a valid exit date";
  if (!isIsoDateNotAfterToday(day)) return "Exit date cannot be in the future";
  const joining = normalizeEmployeeExitDate(dateOfJoining);
  if (joining && day < joining) {
    return "Exit date cannot be before the date of joining";
  }
  return null;
}

export type EmployeeExitSavePlan = {
  employmentStatus: string;
  dateOfLeaving: string | null;
  applyingExit: boolean;
  exitDatePreserved: boolean;
  denial: string | null;
  dateError: string | null;
};

/**
 * How an employee save treats the exit date.
 * A blank date never exits someone and never deletes a stored exit date.
 */
export function resolveEmployeeExitSave(input: {
  canManage: boolean;
  requestedDate: string | null | undefined;
  dateFieldProvided: boolean;
  storedExitDate: string | null | undefined;
  storedEmploymentStatus: string | null | undefined;
  formEmploymentStatus: string;
  dateOfJoining: string | null | undefined;
}): EmployeeExitSavePlan {
  const requestedExitDate = normalizeEmployeeExitDate(input.requestedDate);
  const storedExitDate = normalizeEmployeeExitDate(input.storedExitDate);

  if (!input.canManage && requestedExitDate && requestedExitDate !== storedExitDate) {
    return {
      employmentStatus: input.formEmploymentStatus,
      dateOfLeaving: storedExitDate || null,
      applyingExit: false,
      exitDatePreserved: false,
      denial: "You do not have permission to change the exit date",
      dateError: null,
    };
  }

  const applyingExit = input.canManage && requestedExitDate !== "";
  const clearingExit =
    input.canManage && input.dateFieldProvided && requestedExitDate === "";
  const dateError = applyingExit
    ? employeeExitDateError(requestedExitDate, input.dateOfJoining)
    : null;

  const employmentStatus = applyingExit
    ? input.storedEmploymentStatus === "terminated"
      ? "terminated"
      : "resigned"
    : clearingExit && isFormerEmploymentStatus(input.storedEmploymentStatus)
      ? input.storedEmploymentStatus
      : input.formEmploymentStatus;

  return {
    employmentStatus: employmentStatus ?? input.formEmploymentStatus,
    dateOfLeaving: applyingExit ? requestedExitDate : storedExitDate || null,
    applyingExit: applyingExit && !dateError,
    exitDatePreserved: clearingExit && storedExitDate !== "",
    denial: null,
    dateError,
  };
}
