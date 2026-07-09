import { z } from "zod";

import { paginationSchema } from "@/lib/validations/common";

export const orgListParamsSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const organizationProfileSchema = z.object({
  name: z.string().trim().min(1, "Company name is required"),
  legalName: z.string().trim().optional().nullable(),
  email: z.string().trim().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().trim().optional().nullable(),
  website: z.string().trim().url("Invalid URL").optional().nullable().or(z.literal("")),
  gstNumber: z.string().trim().optional().nullable(),
  panNumber: z.string().trim().optional().nullable(),
  cin: z.string().trim().optional().nullable(),
  registeredAddressLine1: z.string().trim().optional().nullable(),
  registeredAddressLine2: z.string().trim().optional().nullable(),
  registeredCity: z.string().trim().optional().nullable(),
  registeredState: z.string().trim().optional().nullable(),
  registeredCountry: z.string().trim().optional().nullable(),
  registeredPostalCode: z.string().trim().optional().nullable(),
  corporateAddressLine1: z.string().trim().optional().nullable(),
  corporateAddressLine2: z.string().trim().optional().nullable(),
  corporateCity: z.string().trim().optional().nullable(),
  corporateState: z.string().trim().optional().nullable(),
  corporateCountry: z.string().trim().optional().nullable(),
  corporatePostalCode: z.string().trim().optional().nullable(),
  timezone: z.string().trim().min(1),
  currencyCode: z.string().trim().length(3),
  dateFormat: z.string().trim().min(1),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
});

export const branchFormSchema = z.object({
  code: z.string().trim().min(1, "Branch code is required").max(20),
  name: z.string().trim().min(1, "Branch name is required"),
  location: z.string().trim().optional().nullable(),
  addressLine1: z.string().trim().optional().nullable(),
  addressLine2: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  postalCode: z.string().trim().optional().nullable(),
  country: z.string().trim().min(1).default("IN"),
  phone: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  branchHeadId: z.string().uuid().optional().nullable(),
  isHeadOffice: z.boolean().default(false),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const departmentFormSchema = z.object({
  name: z.string().trim().min(1, "Department name is required"),
  code: z.string().trim().min(1, "Department code is required").max(20),
  description: z.string().trim().optional().nullable(),
  departmentHeadId: z.string().uuid().optional().nullable(),
  parentDepartmentId: z.string().uuid().optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const designationFormSchema = z.object({
  title: z.string().trim().min(1, "Designation is required"),
  code: z.string().trim().min(1, "Code is required").max(20),
  departmentId: z.string().uuid().optional().nullable(),
  level: z.coerce.number().int().min(1).default(1),
  description: z.string().trim().optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const employmentTypeFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required").max(20),
  description: z.string().trim().optional().nullable(),
  isFullTime: z.boolean().default(true),
  defaultHoursPerWeek: z.coerce.number().positive().default(40),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

const workingDaySchema = z.enum([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

export const workLocationFormSchema = z.object({
  name: z.string().trim().min(1, "Location name is required"),
  branchId: z.string().uuid("Branch is required"),
  workingDays: z.array(workingDaySchema).min(1, "Select at least one working day"),
  officeStartTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  officeEndTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const holidayFormSchema = z.object({
  name: z.string().trim().min(1, "Holiday name is required"),
  holidayDate: z.string().min(1, "Date is required"),
  holidayType: z.enum(["national", "state", "company"]),
  branchId: z.string().uuid().optional().nullable(),
  isOptional: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurringMonth: z.coerce.number().int().min(1).max(12).optional().nullable(),
  recurringDay: z.coerce.number().int().min(1).max(31).optional().nullable(),
  applicableDepartmentIds: z.array(z.string().uuid()).default([]),
  description: z.string().trim().optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const shiftTemplateFormSchema = z.object({
  name: z.string().trim().min(1, "Shift name is required"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time"),
  breakDurationMinutes: z.coerce.number().int().min(0).default(60),
  graceTimeMinutes: z.coerce.number().int().min(0).default(15),
  minimumHours: z.coerce.number().positive().default(8),
  halfDayHours: z.coerce.number().positive().default(4),
  status: z.enum(["active", "inactive", "archived"]).default("active"),
});

export const hierarchyUpdateSchema = z.object({
  employeeId: z.string().uuid(),
  reportingManagerId: z.string().uuid().nullable(),
});

export const orgSearchSchema = z.object({
  query: z.string().trim().min(1),
});

export const holidayListParamsSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  search: z.string().trim().optional(),
});

export const WORKING_DAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
] as const;

export const HOLIDAY_TYPE_LABELS = {
  national: "National",
  state: "State",
  company: "Company",
} as const;

export const TIMEZONE_OPTIONS = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "UTC",
] as const;

export const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "AED", "SGD"] as const;

export const DATE_FORMAT_OPTIONS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
  "DD-MMM-YYYY",
] as const;

export const FISCAL_MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;
