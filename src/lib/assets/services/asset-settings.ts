import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { DEFAULT_ASSET_SETTINGS } from "@/lib/assets/constants";
import type { AssetSettings } from "@/types/assets";
import type { AssetSettingsFormValues } from "@/lib/validations/assets";

export function mergeAssetSettings(stored?: Partial<AssetSettings> | null): AssetSettings {
  return {
    assetPrefix: stored?.assetPrefix?.trim() || DEFAULT_ASSET_SETTINGS.assetPrefix,
    enableQrCodes: stored?.enableQrCodes !== false,
    warrantyReminderDays: Number(stored?.warrantyReminderDays) || DEFAULT_ASSET_SETTINGS.warrantyReminderDays,
    maintenanceReminderDays:
      Number(stored?.maintenanceReminderDays) || DEFAULT_ASSET_SETTINGS.maintenanceReminderDays,
    defaultReturnDays: Number(stored?.defaultReturnDays) || DEFAULT_ASSET_SETTINGS.defaultReturnDays,
    categories:
      Array.isArray(stored?.categories) && stored.categories.length
        ? stored.categories.map(String)
        : [...DEFAULT_ASSET_SETTINGS.categories],
  };
}

export async function getAssetSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
): Promise<AssetSettings> {
  const { data, error } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mergeAssetSettings((data?.settings as any)?.assets);
}

export async function updateAssetSettings(
  supabase: AuthSupabaseClient,
  organizationId: string,
  userId: string,
  values: AssetSettingsFormValues,
): Promise<AssetSettings> {
  const nextSettings = mergeAssetSettings(values);

  const { data: existing, error: existingError } = await supabase
    .schema("hrms")
    .from("organization_settings")
    .select("id, settings")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const current = (existing.settings as Record<string, unknown>) ?? {};
    const { error } = await supabase
      .schema("hrms")
      .from("organization_settings")
      .update({
        settings: { ...current, assets: nextSettings },
        updated_by: userId,
      })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.schema("hrms").from("organization_settings").insert({
      organization_id: organizationId,
      settings: { assets: nextSettings },
      status: "active",
      created_by: userId,
      updated_by: userId,
    });
    if (error) throw new Error(error.message);
  }

  // Sync category rows for newly added names
  for (const name of nextSettings.categories) {
    const code = name
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "OTHER";

    const { data: found } = await supabase
      .schema("hrms")
      .from("asset_categories")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("code", code)
      .is("deleted_at", null)
      .maybeSingle();

    if (!found) {
      await supabase.schema("hrms").from("asset_categories").insert({
        organization_id: organizationId,
        name,
        code,
        status: "active",
        created_by: userId,
        updated_by: userId,
      });
    }
  }

  return nextSettings;
}

export async function nextAssetCode(
  supabase: AuthSupabaseClient,
  organizationId: string,
  prefix: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;

  const { data, error } = await supabase
    .schema("hrms")
    .from("assets")
    .select("asset_code")
    .eq("organization_id", organizationId)
    .like("asset_code", like)
    .order("asset_code", { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);

  const last = data?.[0]?.asset_code as string | undefined;
  const match = last?.match(/-(\d+)$/);
  const next = match ? Number(match[1]) + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(4, "0")}`;
}
