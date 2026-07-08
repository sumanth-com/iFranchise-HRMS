import { z } from "zod";

import { LETTER_TYPE_OPTIONS } from "@/lib/documents/constants";

const letterTypeValues = LETTER_TYPE_OPTIONS.map((o) => o.value) as [
  (typeof LETTER_TYPE_OPTIONS)[number]["value"],
  ...(typeof LETTER_TYPE_OPTIONS)[number]["value"][],
];

export const documentListParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  employeeId: z.string().uuid().optional().or(z.literal("")),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  documentTypeId: z.string().uuid().optional().or(z.literal("")),
  documentStatus: z
    .enum(["pending", "verified", "rejected", "expired", ""])
    .optional(),
  expiringWindow: z.enum(["today", "7", "30", "expired", ""]).optional(),
});

export const letterListParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  employeeId: z.string().uuid().optional().or(z.literal("")),
  letterType: z.enum([...letterTypeValues, ""] as const).optional(),
  letterStatus: z
    .enum(["draft", "pending_approval", "published", "archived", ""])
    .optional(),
});

export const documentUploadMetaSchema = z.object({
  employeeId: z.string().uuid(),
  documentTypeId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  issuedDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  replaceDocumentId: z.string().uuid().optional().nullable(),
});

export const templateFormSchema = z.object({
  name: z.string().trim().min(2).max(150),
  letterType: z.enum(letterTypeValues),
  documentTypeCode: z.string().trim().min(1).max(80),
  subject: z.string().trim().max(250).optional().nullable(),
  bodyHtml: z.string().trim().min(20),
  isDefault: z.boolean().default(false),
});

export const generateLetterSchema = z.object({
  employeeId: z.string().uuid(),
  letterType: z.enum(letterTypeValues),
  templateId: z.string().uuid().optional().nullable(),
  subject: z.string().trim().max(250).optional().nullable(),
  bodyHtml: z.string().trim().min(10).optional(),
  salaryOverride: z.string().optional().nullable(),
  publishNow: z.boolean().default(false),
});

export const documentSettingsSchema = z.object({
  documentCategories: z.array(z.string().trim().min(1)).min(1),
  allowedFileTypes: z.array(z.string().trim().min(1)).min(1),
  maxUploadSizeMb: z.coerce.number().int().min(1).max(50),
  documentNumberPrefix: z.string().trim().min(1).max(20),
  autoVerification: z.boolean(),
  requireHrApprovalForLetters: z.boolean(),
  enableEmployeeDownloads: z.boolean(),
  retentionPeriodDays: z.coerce.number().int().min(30).max(36500),
});

export type DocumentListParams = z.infer<typeof documentListParamsSchema>;
export type LetterListParams = z.infer<typeof letterListParamsSchema>;
export type DocumentUploadMeta = z.infer<typeof documentUploadMetaSchema>;
export type TemplateFormValues = z.infer<typeof templateFormSchema>;
export type GenerateLetterValues = z.infer<typeof generateLetterSchema>;
export type DocumentSettingsFormValues = z.infer<typeof documentSettingsSchema>;
export type DocumentSettingsFormInput = z.input<typeof documentSettingsSchema>;
