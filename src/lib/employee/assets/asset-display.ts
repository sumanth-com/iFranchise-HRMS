import { format, isValid, parseISO } from "date-fns";

import { classifyMaintenanceIssue } from "@/lib/assets/activity-utils";
import { parseAssetRemarks, parseAssetSpecs } from "@/lib/assets/asset-spec-utils";
import type { AssetMaintenanceStatus } from "@/types/assets";
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

/** Open maintenance that means the asset is actually under repair (not return/status noise). */
export function isOpenRepairMaintenance(
  issue: string,
  maintenanceStatus: AssetMaintenanceStatus,
): boolean {
  if (maintenanceStatus !== "pending" && maintenanceStatus !== "in_progress") return false;
  const kind = classifyMaintenanceIssue(issue);
  if (kind === "issue_reported" || kind === "maintenance_opened") return true;
  if (kind === "status_reported" && /:\s*Maintenance\b/i.test(issue)) return true;
  if (kind === "replacement_requested" && /^Repair\s+requested:/i.test(issue.trim())) return true;
  return false;
}

export function isEmployeeAssetUnderRepair(
  asset: Pick<EmployeeAsset, "assetStatus" | "maintenance">,
): boolean {
  if (asset.assetStatus === "maintenance") return true;
  return asset.maintenance.some((row) =>
    isOpenRepairMaintenance(row.issue, row.maintenanceStatus),
  );
}
