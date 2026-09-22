/**
 * Employment joining date is independent of portal access lifecycle.
 * Never derive or overwrite `date_of_joining` from first login, account
 * activation, invitation, or auth user creation timestamps.
 */

export type PortalAccessTimestamps = {
  firstLoginAt?: string | null;
  accountActivatedAt?: string | null;
  invitationSentAt?: string | null;
};

/** YYYY-MM-DD calendar day in Asia/Kolkata-safe string form (first 10 chars). */
export function toCalendarDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, 10);
}

/**
 * True when the stored joining date equals a portal-access calendar day
 * (first login / activation / invitation). Used to detect corrupted rows
 * where access was mistakenly written into `date_of_joining`.
 */
export function joiningDateMatchesPortalAccessDate(
  dateOfJoining: string | null | undefined,
  access: PortalAccessTimestamps,
): boolean {
  const join = toCalendarDate(dateOfJoining);
  if (!join) return false;
  const portalDays = [
    toCalendarDate(access.firstLoginAt),
    toCalendarDate(access.accountActivatedAt),
    toCalendarDate(access.invitationSentAt),
  ].filter(Boolean) as string[];
  return portalDays.includes(join);
}

/**
 * Login / activation field updates must never touch employment joining date.
 * Portal access uses first_login_at / account_activated_at / invitation_* only.
 */
export function buildSuccessfulLoginAccountUpdates(input: {
  nowIso: string;
  isFirstLogin: boolean;
  shouldActivate: boolean;
  employmentStatus?: string | null;
}): Record<string, unknown> {
  const updates: Record<string, unknown> = {
    last_login_at: input.nowIso,
  };
  if (input.isFirstLogin) updates.first_login_at = input.nowIso;
  if (input.employmentStatus === "draft") updates.employment_status = "active";
  if (input.shouldActivate) {
    updates.account_status = "active";
    updates.account_activated_at = input.nowIso;
    updates.invitation_token = null;
    updates.invitation_expires_at = null;
  }
  // Explicit invariant — callers must not set employment joining from access.
  delete updates.date_of_joining;
  return updates;
}
