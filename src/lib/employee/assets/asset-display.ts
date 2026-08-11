import { format, isValid, parseISO } from "date-fns";

import { parseAssetRemarks, parseAssetSpecs } from "@/lib/assets/asset-spec-utils";
import type { EmployeeAsset } from "@/types/employee-assets";

export function formatAssetDate(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, "dd MMM yyyy") : fallback;
}

/** Primary label employees recognize (e.g. "Dell Latitude 5420"). */
export function getAssetDisplayName(asset: EmployeeAsset): string {
  const fromBrandModel = [asset.brand, asset.model].filter(Boolean).join(" ").trim();
  if (fromBrandModel) return fromBrandModel;
  return asset.name;
}

/** Secondary line under the title (category + internal name when different). */
export function getAssetDisplaySubtitle(asset: EmployeeAsset): string | null {
  const displayName = getAssetDisplayName(asset);
  const parts: string[] = [];
  if (asset.categoryName) parts.push(asset.categoryName);
  if (asset.name && asset.name !== displayName) parts.push(asset.name);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function getAssetConfigurationText(asset: EmployeeAsset): string | null {
  const specs = parseAssetSpecs(asset.notes);
  const lines = [
    specs.chip ? `Chip: ${specs.chip}` : null,
    specs.memory ? `Memory: ${specs.memory}` : null,
    specs.storage ? `Storage: ${specs.storage}` : null,
    specs.operatingSystem ? `OS: ${specs.operatingSystem}` : null,
    specs.connectionType ? `Connection: ${specs.connectionType}` : null,
    specs.accessories ? `Details: ${specs.accessories}` : null,
  ].filter(Boolean);

  if (lines.length > 0) return lines.join("\n");

  const remarks = parseAssetRemarks(asset.notes);
  return remarks ?? null;
}
