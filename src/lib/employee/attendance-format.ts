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

/** Elapsed working seconds between check-in and (checkout or now). */
export function elapsedWorkingSeconds(
  checkInAt: string | null,
  checkOutAt: string | null,
) {
  if (!checkInAt) return 0;
  const end = checkOutAt ? parseISO(checkOutAt) : new Date();
  return Math.max(0, differenceInSeconds(end, parseISO(checkInAt)));
}
