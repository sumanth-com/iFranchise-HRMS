import { differenceInSeconds, parseISO } from "date-fns";

/** Decimal hours (e.g. 7.5) -> "7h 30m". Client-safe (no server imports). */
export function formatHoursLabel(hours: number) {
  const safe = Math.max(0, hours);
  const wholeHours = Math.floor(safe);
  const minutes = Math.round((safe - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

/** Seconds -> "0h 0m" / "7h 5m". */
export function formatWorkingDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

/**
 * Live open-session label. Shows seconds under 1 hour so the counter
 * visibly advances every second / minute instead of sitting on "0h 0m".
 */
export function formatLiveWorkingDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours === 0) {
    return `${minutes}m ${String(secs).padStart(2, "0")}s`;
  }
  return `${hours}h ${minutes}m`;
}

/** Minutes late -> "45m", "1 Hour", "1 hr 1m", "3 hr 7m", etc. */
export function formatLateByLabel(totalMinutes: number) {
  const safe = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;

  if (hours === 1 && minutes === 0) return "1 Hour";
  if (hours > 1 && minutes === 0) return `${hours} hr`;
  if (hours > 0 && minutes > 0) return `${hours} hr ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Wall-clock seconds for one punch pair only (check-out − check-in, or now − check-in).
 * Does not include prior sessions.
 */
export function sessionWorkingSeconds(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined,
  now: Date = new Date(),
): number {
  if (!checkInAt) return 0;
  const end = checkOutAt ? parseISO(checkOutAt) : now;
  return Math.max(0, differenceInSeconds(end, parseISO(checkInAt)));
}

/**
 * Resolve "earlier completed sessions" from `prior_work_seconds`.
 *
 * Column intent: seconds from finished sessions before the current open session.
 * After checkout, writers historically store the *day total* (earlier + current).
 * While checked in, the value is earlier-only.
 */
function resolveEarlierCompletedSeconds(
  priorCompletedSeconds: number,
  sessionSeconds: number,
  hasCheckOut: boolean,
): number {
  const prior = Math.max(0, Math.floor(priorCompletedSeconds));
  if (prior <= 0) return 0;
  if (!hasCheckOut) return prior;

  // Single-session rows corrupted by update-checkout doing prior + session twice.
  if (sessionSeconds > 0 && Math.abs(prior - 2 * sessionSeconds) <= 120) {
    return 0;
  }

  // Day-total write after checkout: prior already includes this session.
  if (prior >= sessionSeconds) {
    return prior - sessionSeconds;
  }

  // Earlier-only while checked out (forward-compatible).
  return prior;
}

/**
 * Canonical working seconds for an attendance day row.
 *
 * - Completed session: (check-out − check-in) + earlier sessions
 * - Open session: (now − check-in) + earlier sessions
 * - No check-in: earlier only (usually 0)
 *
 * `priorCompletedSeconds` is the raw `prior_work_seconds` column (or 0).
 * Never derives duration from scheduled office hours, login, or leave.
 */
export function elapsedWorkingSeconds(
  checkInAt: string | null,
  checkOutAt: string | null,
  now: Date = new Date(),
  priorCompletedSeconds = 0,
) {
  const prior = Math.max(0, Math.floor(priorCompletedSeconds));
  if (!checkInAt) return prior;

  const session = sessionWorkingSeconds(checkInAt, checkOutAt, now);
  const earlier = resolveEarlierCompletedSeconds(
    prior,
    session,
    Boolean(checkOutAt),
  );
  return earlier + session;
}

/**
 * Day-total seconds to persist after a checkout (or checkout update).
 * Avoids double-counting when `prior_work_seconds` already holds a day total
 * from a previous checkout of the same punch pair.
 */
export function dayTotalSecondsAfterCheckout(input: {
  checkInAt: string;
  checkOutAt: string;
  priorWorkSeconds?: number | string | null;
  previousCheckOutAt?: string | null;
}): number {
  const session = sessionWorkingSeconds(input.checkInAt, input.checkOutAt);
  const prior = Math.max(0, Math.floor(Number(input.priorWorkSeconds ?? 0)));
  const previousOut = input.previousCheckOutAt ?? null;

  if (previousOut) {
    const oldSession = sessionWorkingSeconds(input.checkInAt, previousOut);
    const earlier = resolveEarlierCompletedSeconds(prior, oldSession, true);
    return earlier + session;
  }

  // Open → first checkout: prior is earlier-only.
  return prior + session;
}

/** Decimal hours from check-in → checkout. Open sessions are 0 until checkout. */
export function workHoursFromCheckInOut(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined,
) {
  if (!checkInAt || !checkOutAt) return 0;
  const seconds = sessionWorkingSeconds(checkInAt, checkOutAt);
  if (seconds <= 0) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Employee-facing completed hours from actual punch timestamps.
 *
 * - Same-day / overnight: difference of stored ISO timestamps (UTC-safe).
 * - Multi-session: include prior_work_seconds (earlier sessions or legacy day total).
 * - Never invent duration from stale stored work_hours when both punches exist.
 */
export function completedWorkHoursFromPunches(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined,
  options?: {
    storedWorkHours?: number | null;
    priorWorkSeconds?: number | null;
  },
): number {
  const seconds = completedWorkingSecondsFromPunches(checkInAt, checkOutAt, options);
  if (seconds <= 0) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
}

/** Seconds variant of {@link completedWorkHoursFromPunches} for duration labels. */
export function completedWorkingSecondsFromPunches(
  checkInAt: string | null | undefined,
  checkOutAt: string | null | undefined,
  options?: {
    storedWorkHours?: number | null;
    priorWorkSeconds?: number | null;
  },
): number {
  if (!checkInAt) return 0;

  const priorSec = Math.max(0, Math.floor(Number(options?.priorWorkSeconds ?? 0)));

  if (!checkOutAt) {
    // Open session: completed portion is earlier sessions only (live UI adds current).
    if (priorSec > 0) return priorSec;
    // Do not trust stale stored work_hours for an open session.
    return 0;
  }

  // Both punches: always derive from timestamps (+ prior), never from stored work_hours.
  return elapsedWorkingSeconds(checkInAt, checkOutAt, new Date(), priorSec);
}

export type ApplicableWorkingDay = {
  inMonth: boolean;
  isFuture: boolean;
  isToday?: boolean;
  status: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  priorWorkSeconds?: number | null;
};

function isApplicableWorkingDay(day: ApplicableWorkingDay) {
  if (!day.inMonth || day.isFuture) return false;
  if (day.status === "holiday" || day.status === "week_off") return false;
  if (day.status === "on_leave") return false;
  if (day.status == null || day.status === "upcoming") return false;
  return Boolean(day.checkInAt);
}

function secondsForApplicableDay(
  day: ApplicableWorkingDay,
  liveTodaySeconds: number | undefined,
) {
  if (!day.checkInAt) return 0;
  if (day.isToday && !day.checkOutAt && liveTodaySeconds != null) {
    return Math.max(0, Math.floor(liveTodaySeconds));
  }
  return elapsedWorkingSeconds(
    day.checkInAt,
    day.checkOutAt,
    new Date(),
    Math.max(0, Math.floor(Number(day.priorWorkSeconds ?? 0))),
  );
}

/**
 * Average wall-clock seconds across days that actually have a check-in.
 * Holidays, weekend offs, future dates, leave, and no-show days are excluded
 * so Avg Hours matches today's working hours when that is the only worked day.
 */
export function averageApplicableWorkingSeconds(
  days: readonly ApplicableWorkingDay[],
  liveTodaySeconds?: number,
) {
  const applicable = days.filter(isApplicableWorkingDay);
  if (applicable.length === 0) return 0;
  const total = applicable.reduce(
    (sum, day) => sum + secondsForApplicableDay(day, liveTodaySeconds),
    0,
  );
  return Math.floor(total / applicable.length);
}

export function averageApplicableWorkingHours(
  days: readonly ApplicableWorkingDay[],
  liveTodaySeconds?: number,
) {
  const seconds = averageApplicableWorkingSeconds(days, liveTodaySeconds);
  if (seconds <= 0) return 0;
  return Math.round((seconds / 3600) * 100) / 100;
}
