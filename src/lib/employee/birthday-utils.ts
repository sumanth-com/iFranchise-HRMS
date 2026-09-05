import { parseISO } from "date-fns";

/** True when month/day of DOB matches the reference calendar date. */
export function isBirthdayOnDate(
  dateOfBirth: string | null | undefined,
  referenceDate: string,
): boolean {
  if (!dateOfBirth || dateOfBirth.length < 10 || !referenceDate) return false;
  try {
    const birth = parseISO(dateOfBirth.slice(0, 10));
    const today = parseISO(referenceDate.slice(0, 10));
    return (
      birth.getMonth() === today.getMonth() && birth.getDate() === today.getDate()
    );
  } catch {
    return false;
  }
}

export function birthdayDisplayFirstName(
  firstName?: string | null,
  fallbackTitle?: string | null,
): string {
  const fromFirst = firstName?.trim();
  if (fromFirst) return fromFirst;
  const fromTitle = fallbackTitle?.trim().split(/\s+/)[0];
  return fromTitle || "there";
}

export function birthdayPossessive(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "Someone's";
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}

/** Warm copy for celebration cards (upcoming vs actual day). */
export function birthdayCardMessage(input: {
  firstName?: string | null;
  title?: string | null;
  isToday: boolean;
}): string {
  const name = birthdayDisplayFirstName(input.firstName, input.title);
  if (input.isToday) {
    return `Happy Birthday, ${name}! Wishing you a fantastic year ahead.`;
  }
  return `${birthdayPossessive(name)} special day is coming up! Let's make it memorable.`;
}

export function birthdayCheckInStorageKey(employeeId: string, date: string): string {
  return `hrms:birthday-checkin-celebration:${employeeId}:${date.slice(0, 10)}`;
}

export function hasShownBirthdayCheckInCelebration(
  employeeId: string,
  date: string,
): boolean {
  if (typeof window === "undefined") return true;
  try {
    return Boolean(window.localStorage.getItem(birthdayCheckInStorageKey(employeeId, date)));
  } catch {
    return true;
  }
}

export function markBirthdayCheckInCelebrationShown(
  employeeId: string,
  date: string,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(birthdayCheckInStorageKey(employeeId, date), "1");
  } catch {
    // Ignore storage failures — celebration may reappear, but check-in must not break.
  }
}
