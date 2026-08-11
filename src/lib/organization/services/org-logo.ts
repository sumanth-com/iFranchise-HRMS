import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { ASSET_IMAGE_BUCKET } from "@/lib/assets/constants";
import { createSignedStorageUrl } from "@/lib/employees/services/employee-mutations";
import {
  ORGANIZATION_LOGO_MAX_BYTES,
  ORGANIZATION_LOGO_PATH_PREFIX,
} from "@/lib/organization/constants";

export function buildOrganizationLogoStoragePath(
  organizationId: string,
  extension: string,
): string {
  const safeExt = extension.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  return `${organizationId}/${ORGANIZATION_LOGO_PATH_PREFIX}/logo.${safeExt}`;
}

export async function getOrganizationLogoSignedUrl(
  supabase: AuthSupabaseClient,
  logoStoragePath: string | null | undefined,
): Promise<string | null> {
  if (!logoStoragePath) return null;
  return createSignedStorageUrl(supabase, ASSET_IMAGE_BUCKET, logoStoragePath);
}

export async function uploadOrganizationLogo(
  supabase: AuthSupabaseClient,
  organizationId: string,
  file: File,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please select an image file");
  }

  if (file.size > ORGANIZATION_LOGO_MAX_BYTES) {
    throw new Error("Company logo must be 10 MB or smaller");
  }

  const extension = file.name.split(".").pop() ?? "png";
  const storagePath = buildOrganizationLogoStoragePath(organizationId, extension);

  const { error } = await supabase.storage
    .from(ASSET_IMAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (error) throw new Error(error.message);

  return storagePath;
}

export async function removeOrganizationLogoFile(
  supabase: AuthSupabaseClient,
  storagePath: string,
): Promise<void> {
  const { error } = await supabase.storage.from(ASSET_IMAGE_BUCKET).remove([storagePath]);
  if (error) throw new Error(error.message);
}
