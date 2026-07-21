import { hasAnyPermission } from "@/lib/permissions/utils";
import type {
  AssetAssignmentStatus,
  AssetCondition,
  AssetMaintenanceStatus,
  AssetStatus,
} from "@/types/assets";

export const ASSETS_ROUTES = {
  dashboard: "/dashboard/assets-management",
  inventory: "/dashboard/assets-management/inventory",
  assignments: "/dashboard/assets-management/assignments",
  maintenance: "/dashboard/assets-management/maintenance",
  vendors: "/dashboard/assets-management/vendors",
  reports: "/dashboard/assets-management/reports",
  settings: "/dashboard/assets-management/settings",
} as const;

/** Personal / self-service assets in the HR portal main nav. */
export const SELF_ASSETS_ROUTES = {
  list: "/dashboard/assets",
} as const;

export function assetsTeamListUrl(
  searchParams?: Record<string, string | undefined>,
) {
  const params = new URLSearchParams({ tab: "team" });
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });
  }
  return `${SELF_ASSETS_ROUTES.list}?${params.toString()}`;
}

export const ASSETS_SUB_NAV = [
  { title: "Dashboard", href: ASSETS_ROUTES.dashboard },
  { title: "Assets", href: ASSETS_ROUTES.inventory },
  { title: "Assignments", href: ASSETS_ROUTES.assignments },
  { title: "Maintenance", href: ASSETS_ROUTES.maintenance },
  { title: "Vendors", href: ASSETS_ROUTES.vendors },
  { title: "Reports", href: ASSETS_ROUTES.reports },
  { title: "Settings", href: ASSETS_ROUTES.settings },
] as const;

export const ASSET_IMAGE_BUCKET = "company-assets";

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  available: "Available",
  assigned: "Assigned",
  maintenance: "Maintenance",
  lost: "Lost",
  retired: "Retired",
  disposed: "Disposed",
};

export const ASSIGNMENT_STATUS_LABELS: Record<AssetAssignmentStatus, string> = {
  active: "Active",
  returned: "Returned",
  transferred: "Transferred",
  lost: "Lost",
  damaged: "Damaged",
};

export const MAINTENANCE_STATUS_LABELS: Record<AssetMaintenanceStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CONDITION_LABELS: Record<AssetCondition, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  damaged: "Damaged",
};

export const DEFAULT_ASSET_SETTINGS = {
  assetPrefix: "AST",
  enableQrCodes: true,
  warrantyReminderDays: 30,
  maintenanceReminderDays: 14,
  defaultReturnDays: 30,
  categories: [
    "Laptop",
    "Desktop",
    "Monitor",
    "Keyboard",
    "Mouse",
    "Mobile",
    "SIM",
    "Printer",
    "Furniture",
    "ID Card",
    "Access Card",
    "Other",
  ],
} as const;

export function canViewAssets(codes: string[]) {
  return hasAnyPermission(codes, ["asset.view"]);
}

export function canCreateAssets(codes: string[]) {
  return hasAnyPermission(codes, ["asset.create", "asset.edit"]);
}

export function canEditAssets(codes: string[]) {
  return hasAnyPermission(codes, ["asset.edit", "asset.create"]);
}

export function canAssignAssets(codes: string[]) {
  return hasAnyPermission(codes, ["asset.assign", "asset.edit"]);
}

export function canReturnAssets(codes: string[]) {
  return hasAnyPermission(codes, ["asset.return", "asset.assign", "asset.edit"]);
}

export function canDeleteAssets(codes: string[]) {
  return hasAnyPermission(codes, ["asset.delete"]);
}

export function canManageAssetSettings(codes: string[]) {
  return hasAnyPermission(codes, ["asset.edit", "settings.manage", "asset.create"]);
}
