import { z } from "zod";

import { isValidStoredPhone } from "@/lib/phone/phone";

const PHONE_MESSAGE =
  "Enter a valid phone number with country code and the correct number of digits";

/** Required contact number with country code + exact national length. */
export const requiredPhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine(isValidStoredPhone, PHONE_MESSAGE);

/** Optional contact number; empty OK, otherwise must be valid. */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || isValidStoredPhone(value), PHONE_MESSAGE);

/** Optional/nullable phone for forms that allow null. */
export const optionalNullablePhoneSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value.trim() : ""))
  .refine((value) => value.length === 0 || isValidStoredPhone(value), PHONE_MESSAGE);
