import { z } from "zod";

import {
  ASSET_DEVICE_CATALOG_KEYS,
  type AssetDeviceCatalogKey,
} from "@/lib/assets/asset-device-images";
import { optionalNullablePhoneSchema } from "@/lib/validations/phone";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const optionalIsoDate = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed) return null;
    return /^\d{4}-\d{2}-\d{2}/.test(trimmed) ? trimmed.slice(0, 10) : null;
  });

export const assetListParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  assetStatus: z
    .enum(["available", "assigned", "maintenance", "lost", "retired", "disposed", ""])
    .optional(),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  location: z.string().optional(),
  employeeId: z.string().uuid().optional().or(z.literal("")),
});

export const assignmentListParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  employeeId: z.string().uuid().optional().or(z.literal("")),
  assetId: z.string().uuid().optional().or(z.literal("")),
  assignmentStatus: z
    .enum(["active", "returned", "transferred", "lost", "damaged", ""])
    .optional(),
});

export const maintenanceListParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  assetId: z.string().uuid().optional().or(z.literal("")),
  maintenanceStatus: z
    .enum(["pending", "in_progress", "completed", "cancelled", ""])
    .optional(),
});

export const assetFormSchema = z.object({
  name: z.string().trim().min(2).max(150),
  categoryId: z.string().uuid().optional().nullable(),
  brand: z.string().trim().max(100).optional().nullable(),
  model: z.string().trim().max(100).optional().nullable(),
  serialNumber: z.string().trim().max(120).optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  purchaseCost: z.coerce.number().min(0).optional().nullable(),
  warrantyExpiry: z.string().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  assetStatus: z
    .enum(["available", "assigned", "maintenance", "lost", "retired", "disposed"])
    .default("available"),
  officeLocation: z.string().trim().max(150).optional().nullable(),
  departmentId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const assignAssetSchema = z.object({
  assetId: z.string().uuid(),
  employeeId: z.string().uuid(),
  assignedDate: z.string().min(1),
  expectedReturnDate: z.string().optional().nullable(),
  conditionBefore: z.enum(["excellent", "good", "fair", "poor", "damaged"]).default("good"),
  remarks: optionalText(2000),
  brand: optionalText(100),
  model: optionalText(100),
  serialNumber: optionalText(120),
  specChip: optionalText(120),
  specMemory: optionalText(120),
  specStorage: optionalText(120),
  specOperatingSystem: optionalText(120),
  specAccessories: optionalText(500),
  specConnectionType: optionalText(120),
  warrantyExpiry: optionalIsoDate,
});

export const returnAssetSchema = z.object({
  assignmentId: z.string().uuid(),
  returnedDate: z.string().min(1),
  conditionAfter: z.enum(["excellent", "good", "fair", "poor", "damaged"]).default("good"),
  returnRemarks: z.string().trim().max(2000).optional().nullable(),
  markAs: z.enum(["returned", "lost", "damaged"]).default("returned"),
});

export const transferAssetSchema = z.object({
  assignmentId: z.string().uuid(),
  toEmployeeId: z.string().uuid(),
  assignedDate: z.string().min(1),
  expectedReturnDate: z.string().optional().nullable(),
  conditionBefore: z.enum(["excellent", "good", "fair", "poor", "damaged"]).default("good"),
  remarks: z.string().trim().max(2000).optional().nullable(),
});

export const maintenanceFormSchema = z.object({
  assetId: z.string().uuid(),
  vendorId: z.string().uuid().optional().nullable(),
  maintenanceDate: z.string().min(1),
  issue: z.string().trim().min(3).max(2000),
  cost: z.coerce.number().min(0).optional().nullable(),
  nextServiceDate: z.string().optional().nullable(),
  maintenanceStatus: z
    .enum(["pending", "in_progress", "completed", "cancelled"])
    .default("pending"),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const vendorFormSchema = z.object({
  name: z.string().trim().min(2).max(150),
  contactPerson: z.string().trim().max(120).optional().nullable(),
  phone: optionalNullablePhoneSchema,
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  address: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const assetSettingsSchema = z.object({
  assetPrefix: z.string().trim().min(1).max(20),
  enableQrCodes: z.boolean(),
  warrantyReminderDays: z.coerce.number().int().min(1).max(365),
  maintenanceReminderDays: z.coerce.number().int().min(1).max(365),
  defaultReturnDays: z.coerce.number().int().min(1).max(3650),
  categories: z.array(z.string().trim().min(1)).min(1),
});

export const createAndAssignAssetSchema = z.object({
  employeeId: z.string().uuid(),
  assetType: z.enum(
    ASSET_DEVICE_CATALOG_KEYS as [AssetDeviceCatalogKey, ...AssetDeviceCatalogKey[]],
  ),
  brand: optionalText(100),
  model: optionalText(100),
  serialNumber: optionalText(120),
  specChip: optionalText(120),
  specMemory: optionalText(120),
  specStorage: optionalText(120),
  specOperatingSystem: optionalText(120),
  specAccessories: optionalText(500),
  specConnectionType: optionalText(120),
  warrantyExpiry: optionalIsoDate,
  purchaseDate: z.string().optional().nullable(),
  conditionBefore: z.enum(["excellent", "good", "fair", "poor", "damaged"]).default("good"),
  remarks: z.string().trim().max(2000).optional().nullable(),
  assignedDate: z.string().min(1),
});

export type AssetListParams = z.infer<typeof assetListParamsSchema>;
export type AssignmentListParams = z.infer<typeof assignmentListParamsSchema>;
export type MaintenanceListParams = z.infer<typeof maintenanceListParamsSchema>;
export type AssetFormValues = z.infer<typeof assetFormSchema>;
export type AssignAssetValues = z.infer<typeof assignAssetSchema>;
export type ReturnAssetValues = z.infer<typeof returnAssetSchema>;
export type TransferAssetValues = z.infer<typeof transferAssetSchema>;
export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;
export type VendorFormValues = z.infer<typeof vendorFormSchema>;
export type AssetSettingsFormValues = z.infer<typeof assetSettingsSchema>;
export type AssetSettingsFormInput = z.input<typeof assetSettingsSchema>;
export type CreateAndAssignAssetValues = z.infer<typeof createAndAssignAssetSchema>;
