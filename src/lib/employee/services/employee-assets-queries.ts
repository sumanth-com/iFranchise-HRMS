import { differenceInCalendarDays, startOfDay } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import { createSignedAssetImageUrl } from "@/lib/assets/services/asset-mutations";
import { AssetRow, fromHrms, unwrapRelation } from "@/lib/assets/services/assets-utils";
import type { UserProfile } from "@/types/auth";
import type {
  AssetAssignmentStatus,
  AssetCondition,
  AssetMaintenanceStatus,
  AssetStatus,
} from "@/types/assets";
import type {
  EmployeeAsset,
  EmployeeAssetMaintenance,
  EmployeeAssetWarranty,
  EmployeeAssetsData,
} from "@/types/employee-assets";

const WARRANTY_SOON_DAYS = 30;

const ASSIGNMENT_SELECT = `
  id, asset_id, assignment_status, assigned_date, expected_return_date, returned_date,
  condition_before, condition_after, remarks, return_remarks, created_at,
  assets:asset_id(
    id, asset_code, name, brand, model, serial_number, purchase_date, warranty_expiry,
    asset_status, office_location, image_path, notes,
    asset_categories:category_id(name)
  )
`;

function computeWarranty(expiry: string | null): EmployeeAssetWarranty {
  if (!expiry) return { status: "none", expiry: null, daysRemaining: null };
  const today = startOfDay(new Date());
  const daysRemaining = differenceInCalendarDays(startOfDay(new Date(expiry)), today);
  return {
    status: daysRemaining >= 0 ? "active" : "expired",
    expiry,
    daysRemaining,
  };
}

/**
 * Everything the Employee Self-Service "My Assets" module needs, scoped strictly to the
 * signed-in employee: their asset assignments (current + past), each asset's full detail,
 * warranty status, and the maintenance history for those assets. Read-only — employees
 * only hold `asset.view`.
 */
export async function getEmployeeAssetsData(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<EmployeeAssetsData> {
  const organizationId = profile.employee.organizationId;
  const employeeId = profile.employee.id;

  const { data, error } = await fromHrms(supabase, "asset_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("assigned_date", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as AssetRow[];

  const assetIds = Array.from(
    new Set(rows.map((row) => unwrapRelation(row.assets)?.id).filter(Boolean)),
  ) as string[];

  // Maintenance history for the employee's assets.
  const maintenanceByAsset = new Map<string, EmployeeAssetMaintenance[]>();
  if (assetIds.length > 0) {
    const { data: maint, error: maintError } = await fromHrms(supabase, "asset_maintenance")
      .select(
        `id, asset_id, maintenance_date, issue, maintenance_status, next_service_date,
         completed_at, notes, asset_vendors:vendor_id(name)`,
      )
      .eq("organization_id", organizationId)
      .in("asset_id", assetIds)
      .is("deleted_at", null)
      .order("maintenance_date", { ascending: false });

    if (maintError) throw new Error(maintError.message);

    for (const row of (maint ?? []) as AssetRow[]) {
      const list = maintenanceByAsset.get(row.asset_id) ?? [];
      list.push({
        id: row.id,
        maintenanceDate: row.maintenance_date,
        issue: row.issue,
        maintenanceStatus: row.maintenance_status as AssetMaintenanceStatus,
        nextServiceDate: row.next_service_date ?? null,
        completedAt: row.completed_at ?? null,
        vendorName: unwrapRelation(row.asset_vendors)?.name ?? null,
        notes: row.notes ?? null,
      });
      maintenanceByAsset.set(row.asset_id, list);
    }
  }

  // Resolve signed image URLs for distinct image paths (private bucket).
  const imagePaths = Array.from(
    new Set(
      rows
        .map((row) => unwrapRelation(row.assets)?.image_path)
        .filter((path): path is string => Boolean(path)),
    ),
  );
  const imageUrlByPath = new Map<string, string>();
  await Promise.all(
    imagePaths.map(async (path) => {
      const url = await createSignedAssetImageUrl(supabase, path);
      if (url) imageUrlByPath.set(path, url);
    }),
  );

  const items: EmployeeAsset[] = rows.map((row) => {
    const asset = unwrapRelation(row.assets);
    const category = unwrapRelation(asset?.asset_categories ?? null);
    const imagePath = asset?.image_path as string | null | undefined;
    const maintenance = asset?.id ? maintenanceByAsset.get(asset.id) ?? [] : [];

    return {
      assignmentId: row.id,
      assignmentStatus: row.assignment_status as AssetAssignmentStatus,
      assignedDate: row.assigned_date,
      expectedReturnDate: row.expected_return_date ?? null,
      returnedDate: row.returned_date ?? null,
      conditionBefore: row.condition_before as AssetCondition,
      conditionAfter: (row.condition_after ?? null) as AssetCondition | null,
      remarks: row.remarks ?? null,
      returnRemarks: row.return_remarks ?? null,

      assetId: asset?.id ?? row.asset_id,
      assetCode: asset?.asset_code ?? "—",
      name: asset?.name ?? "Asset",
      categoryName: category?.name ?? null,
      brand: asset?.brand ?? null,
      model: asset?.model ?? null,
      serialNumber: asset?.serial_number ?? null,
      purchaseDate: asset?.purchase_date ?? null,
      assetStatus: (asset?.asset_status ?? "assigned") as AssetStatus,
      officeLocation: asset?.office_location ?? null,
      notes: asset?.notes ?? null,
      imageUrl: imagePath ? imageUrlByPath.get(imagePath) ?? null : null,

      warranty: computeWarranty(asset?.warranty_expiry ?? null),
      maintenance,
    };
  });

  const assigned = items.filter((item) => item.assignmentStatus === "active");
  const history = items.filter((item) => item.assignmentStatus !== "active");

  const underRepair = assigned.filter(
    (item) =>
      item.assetStatus === "maintenance" ||
      item.maintenance.some(
        (m) => m.maintenanceStatus === "pending" || m.maintenanceStatus === "in_progress",
      ),
  ).length;

  const warrantyExpiringSoon = assigned.filter(
    (item) =>
      item.warranty.status === "active" &&
      item.warranty.daysRemaining !== null &&
      item.warranty.daysRemaining <= WARRANTY_SOON_DAYS,
  ).length;

  const categories = Array.from(
    new Set(items.map((item) => item.categoryName).filter((name): name is string => Boolean(name))),
  ).sort((a, b) => a.localeCompare(b));

  return {
    assigned,
    history,
    summary: {
      currentlyAssigned: assigned.length,
      previouslyReturned: history.filter(
        (item) => item.assignmentStatus === "returned" || item.assignmentStatus === "transferred",
      ).length,
      underRepair,
      warrantyExpiringSoon,
      lostOrDamaged: items.filter(
        (item) => item.assignmentStatus === "lost" || item.assignmentStatus === "damaged",
      ).length,
    },
    categories,
  };
}
