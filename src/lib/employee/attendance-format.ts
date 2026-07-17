import { differenceInSeconds, parseISO } from "date-fns";

/** Decimal hours (e.g. 7.5) -> "7h 30m". Client-safe (no server imports). */
export function formatHoursLabel(hours: number) {
  const safe = Math.max(0, hours);
  const wholeHours = Math.floor(safe);
  const minutes = Math.round((safe - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
}

/** Seconds -> "7h 05m". */
export function formatWorkingDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
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
