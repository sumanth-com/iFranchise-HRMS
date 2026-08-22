import { z } from "zod";

/** ISO date string (YYYY-MM-DD) that is empty or not after today (local calendar day). */
export function isIsoDateNotAfterToday(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return true;
  const day = trimmed.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return day <= todayIso;
}

export const optionalPastOrTodayDateSchema = z
  .string()
  .optional()
  .or(z.literal(""))
  .refine((value) => isIsoDateNotAfterToday(value), {
    message: "Date of birth cannot be in the future",
  });

export function todayIsoDateLocal(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}
