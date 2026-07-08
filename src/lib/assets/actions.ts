"use server";

import { revalidatePath } from "next/cache";

import { ASSETS_ROUTES } from "@/lib/assets/constants";
import {
  assignAsset,
  createAsset,
  createMaintenance,
  createSignedAssetImageUrl,
  createVendor,
  deleteAsset,
  deleteVendor,
  getAssetQrDataUrl,
  returnAsset,
  transferAsset,
  updateAsset,
  updateMaintenanceStatus,
  updateVendor,
} from "@/lib/assets/services/asset-mutations";
import {
  getAssetSettings,
  updateAssetSettings,
} from "@/lib/assets/services/asset-settings";
import { requireServerAnyPermission, requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";
import {
  assetFormSchema,
  assetSettingsSchema,
  assignAssetSchema,
  maintenanceFormSchema,
  returnAssetSchema,
  transferAssetSchema,
  vendorFormSchema,
} from "@/lib/validations/assets";

function revalidateAssets(employeeId?: string) {
  revalidatePath(ASSETS_ROUTES.dashboard);
  revalidatePath(ASSETS_ROUTES.inventory);
  revalidatePath(ASSETS_ROUTES.assignments);
  revalidatePath(ASSETS_ROUTES.maintenance);
  revalidatePath(ASSETS_ROUTES.vendors);
  revalidatePath(ASSETS_ROUTES.reports);
  revalidatePath(ASSETS_ROUTES.settings);
  revalidatePath("/dashboard/employees");
  if (employeeId) {
    revalidatePath(`/dashboard/employees`);
  }
}

export async function saveAssetAction(formData: FormData, assetId?: string) {
  try {
    const profile = await requireServerAnyPermission(
      assetId ? ["asset.edit"] : ["asset.create", "asset.edit"],
    );
    const supabase = await createClient();
    const parsed = assetFormSchema.parse({
      name: formData.get("name"),
      categoryId: formData.get("categoryId") || null,
      brand: formData.get("brand") || null,
      model: formData.get("model") || null,
      serialNumber: formData.get("serialNumber") || null,
      purchaseDate: formData.get("purchaseDate") || null,
      purchaseCost: formData.get("purchaseCost") || null,
      warrantyExpiry: formData.get("warrantyExpiry") || null,
      vendorId: formData.get("vendorId") || null,
      assetStatus: formData.get("assetStatus") || "available",
      officeLocation: formData.get("officeLocation") || null,
      departmentId: formData.get("departmentId") || null,
      notes: formData.get("notes") || null,
    });
    const image = formData.get("image");
    const imageFile = image instanceof File && image.size > 0 ? image : null;

    if (assetId) {
      await updateAsset(supabase, profile, assetId, parsed, imageFile);
    } else {
      await createAsset(supabase, profile, parsed, imageFile);
    }
    revalidateAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save asset",
    };
  }
}

export async function deleteAssetAction(assetId: string) {
  try {
    const profile = await requireServerPermission("asset.delete");
    const supabase = await createClient();
    await deleteAsset(supabase, profile, assetId);
    revalidateAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to delete asset",
    };
  }
}

export async function assignAssetAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission(["asset.assign", "asset.edit"]);
    const supabase = await createClient();
    const parsed = assignAssetSchema.parse(input);
    const id = await assignAsset(supabase, profile, parsed);
    revalidateAssets(parsed.employeeId);
    return { success: true as const, data: id };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to assign asset",
    };
  }
}

export async function returnAssetAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      "asset.return",
      "asset.assign",
      "asset.edit",
    ]);
    const supabase = await createClient();
    const parsed = returnAssetSchema.parse(input);
    await returnAsset(supabase, profile, parsed);
    revalidateAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to return asset",
    };
  }
}

export async function transferAssetAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission(["asset.assign", "asset.edit"]);
    const supabase = await createClient();
    const parsed = transferAssetSchema.parse(input);
    const id = await transferAsset(supabase, profile, parsed);
    revalidateAssets(parsed.toEmployeeId);
    return { success: true as const, data: id };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to transfer asset",
    };
  }
}

export async function saveMaintenanceAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission(["asset.edit", "asset.create"]);
    const supabase = await createClient();
    const parsed = maintenanceFormSchema.parse(input);
    const id = await createMaintenance(supabase, profile, parsed);
    revalidateAssets();
    return { success: true as const, data: id };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save maintenance",
    };
  }
}

export async function completeMaintenanceAction(
  maintenanceId: string,
  status: "completed" | "cancelled" | "in_progress" | "pending",
) {
  try {
    const profile = await requireServerAnyPermission(["asset.edit"]);
    const supabase = await createClient();
    await updateMaintenanceStatus(supabase, profile, maintenanceId, status);
    revalidateAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to update maintenance",
    };
  }
}

export async function saveVendorAction(input: unknown, vendorId?: string) {
  try {
    const profile = await requireServerAnyPermission(["asset.edit", "asset.create"]);
    const supabase = await createClient();
    const parsed = vendorFormSchema.parse(input);
    if (vendorId) {
      await updateVendor(supabase, profile, vendorId, parsed);
    } else {
      await createVendor(supabase, profile, parsed);
    }
    revalidateAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save vendor",
    };
  }
}

export async function deleteVendorAction(vendorId: string) {
  try {
    const profile = await requireServerAnyPermission(["asset.delete", "asset.edit"]);
    const supabase = await createClient();
    await deleteVendor(supabase, profile, vendorId);
    revalidateAssets();
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to delete vendor",
    };
  }
}

export async function saveAssetSettingsAction(input: unknown) {
  try {
    const profile = await requireServerAnyPermission([
      "asset.edit",
      "settings.manage",
      "asset.create",
    ]);
    const supabase = await createClient();
    const parsed = assetSettingsSchema.parse(input);
    const data = await updateAssetSettings(
      supabase,
      profile.employee.organizationId,
      profile.userId,
      parsed,
    );
    revalidatePath(ASSETS_ROUTES.settings);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save settings",
    };
  }
}

export async function getAssetQrAction(payload: string) {
  try {
    await requireServerPermission("asset.view");
    const dataUrl = await getAssetQrDataUrl(payload);
    return { success: true as const, data: dataUrl };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to generate QR",
    };
  }
}

export async function getAssetImageUrlAction(path: string) {
  try {
    await requireServerPermission("asset.view");
    const supabase = await createClient();
    const url = await createSignedAssetImageUrl(supabase, path);
    if (!url) return { success: false as const, message: "Unable to open image" };
    return { success: true as const, data: url };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load image",
    };
  }
}

export async function getAssetSettingsAction() {
  try {
    const profile = await requireServerPermission("asset.view");
    const supabase = await createClient();
    const data = await getAssetSettings(supabase, profile.employee.organizationId);
    return { success: true as const, data };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to load settings",
    };
  }
}
