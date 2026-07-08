import { addDays, format, startOfDay } from "date-fns";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { getAssetSettings } from "@/lib/assets/services/asset-settings";
import {
  AssetRow,
  formatEmployeeName,
  fromHrms,
  isEmployeeOnly,
  unwrapRelation,
} from "@/lib/assets/services/assets-utils";
import type {
  AssetListParams,
  AssignmentListParams,
  MaintenanceListParams,
} from "@/lib/validations/assets";
import type {
  AssetAssignmentItem,
  AssetAssignmentListResult,
  AssetCategoryItem,
  AssetItem,
  AssetListResult,
  AssetMaintenanceItem,
  AssetMaintenanceListResult,
  AssetVendorItem,
  AssetsLookups,
  AssetsReportData,
  AssetsSummary,
} from "@/types/assets";

function mapAsset(row: AssetRow): AssetItem {
  const category = unwrapRelation(row.asset_categories);
  const vendor = unwrapRelation(row.asset_vendors);
  const dept = unwrapRelation(row.departments);
  const assignment = unwrapRelation(row.asset_assignments);
  const employee = unwrapRelation(assignment?.employees ?? null);

  return {
    id: row.id,
    assetCode: row.asset_code,
    name: row.name,
    categoryId: row.category_id,
    categoryName: category?.name ?? null,
    brand: row.brand,
    model: row.model,
    serialNumber: row.serial_number,
    purchaseDate: row.purchase_date,
    purchaseCost: row.purchase_cost != null ? Number(row.purchase_cost) : null,
    warrantyExpiry: row.warranty_expiry,
    vendorId: row.vendor_id,
    vendorName: vendor?.name ?? null,
    assetStatus: row.asset_status,
    officeLocation: row.office_location,
    departmentId: row.department_id,
    departmentName: dept?.name ?? null,
    imagePath: row.image_path,
    qrPayload: row.qr_payload,
    notes: row.notes,
    currentAssignmentId: row.current_assignment_id,
    assignedEmployeeId: employee?.id ?? null,
    assignedEmployeeName: employee
      ? formatEmployeeName(employee.first_name, employee.last_name)
      : null,
    createdAt: row.created_at,
  };
}

function mapAssignment(row: AssetRow): AssetAssignmentItem {
  const asset = unwrapRelation(row.assets);
  const category = unwrapRelation(asset?.asset_categories ?? null);
  const employee = unwrapRelation(row.employees);
  const dept = unwrapRelation(employee?.departments ?? null);

  return {
    id: row.id,
    assetId: row.asset_id,
    assetCode: asset?.asset_code ?? "—",
    assetName: asset?.name ?? "—",
    categoryName: category?.name ?? null,
    employeeId: row.employee_id,
    employeeCode: employee?.employee_code ?? "—",
    employeeName: formatEmployeeName(employee?.first_name, employee?.last_name),
    departmentName: dept?.name ?? null,
    assignedDate: row.assigned_date,
    expectedReturnDate: row.expected_return_date,
    returnedDate: row.returned_date,
    conditionBefore: row.condition_before,
    conditionAfter: row.condition_after,
    assignmentStatus: row.assignment_status,
    remarks: row.remarks,
    returnRemarks: row.return_remarks,
    createdAt: row.created_at,
  };
}

function mapMaintenance(row: AssetRow): AssetMaintenanceItem {
  const asset = unwrapRelation(row.assets);
  const vendor = unwrapRelation(row.asset_vendors);

  return {
    id: row.id,
    assetId: row.asset_id,
    assetCode: asset?.asset_code ?? "—",
    assetName: asset?.name ?? "—",
    vendorId: row.vendor_id,
    vendorName: vendor?.name ?? null,
    maintenanceDate: row.maintenance_date,
    issue: row.issue,
    cost: row.cost != null ? Number(row.cost) : null,
    nextServiceDate: row.next_service_date,
    maintenanceStatus: row.maintenance_status,
    completedAt: row.completed_at,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

const ASSET_SELECT = `
  id, asset_code, name, category_id, brand, model, serial_number, purchase_date,
  purchase_cost, warranty_expiry, vendor_id, asset_status, office_location,
  department_id, image_path, qr_payload, notes, current_assignment_id, created_at,
  asset_categories:category_id(name, code),
  asset_vendors:vendor_id(name),
  departments:department_id(name),
  asset_assignments:current_assignment_id(
    id, employee_id,
    employees:employee_id(id, first_name, last_name, employee_code)
  )
`;

export async function listAssets(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: AssetListParams,
): Promise<AssetListResult> {
  const organizationId = profile.employee.organizationId;
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = fromHrms(supabase, "assets")
    .select(ASSET_SELECT, { count: "exact" })
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (params.categoryId) query = query.eq("category_id", params.categoryId);
  if (params.assetStatus) query = query.eq("asset_status", params.assetStatus);
  if (params.departmentId) query = query.eq("department_id", params.departmentId);
  if (params.location?.trim()) {
    query = query.ilike("office_location", `%${params.location.trim()}%`);
  }
  if (params.search?.trim()) {
    const q = params.search.trim();
    query = query.or(
      `name.ilike.%${q}%,asset_code.ilike.%${q}%,serial_number.ilike.%${q}%,brand.ilike.%${q}%`,
    );
  }

  // Employee-only: show assets currently assigned to them
  if (isEmployeeOnly(profile)) {
    const { data: mine } = await fromHrms(supabase, "asset_assignments")
      .select("asset_id")
      .eq("employee_id", profile.employee.id)
      .eq("assignment_status", "active")
      .is("deleted_at", null);
    const ids = (mine ?? []).map((r: AssetRow) => r.asset_id);
    if (ids.length === 0) {
      return { data: [], total: 0, page: params.page, pageSize: params.pageSize };
    }
    query = query.in("id", ids);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map(mapAsset),
    total: count ?? 0,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function listAssignments(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: AssignmentListParams,
): Promise<AssetAssignmentListResult> {
  const organizationId = profile.employee.organizationId;
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = fromHrms(supabase, "asset_assignments")
    .select(
      `
      id, asset_id, employee_id, assigned_date, expected_return_date, returned_date,
      condition_before, condition_after, assignment_status, remarks, return_remarks, created_at,
      assets:asset_id(asset_code, name, asset_categories:category_id(name)),
      employees:employee_id(employee_code, first_name, last_name, departments:department_id(name))
    `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("assigned_date", { ascending: false })
    .range(from, to);

  if (isEmployeeOnly(profile)) {
    query = query.eq("employee_id", profile.employee.id);
  } else if (params.employeeId) {
    query = query.eq("employee_id", params.employeeId);
  }
  if (params.assetId) query = query.eq("asset_id", params.assetId);
  if (params.assignmentStatus) query = query.eq("assignment_status", params.assignmentStatus);
  if (params.search?.trim()) {
    query = query.ilike("remarks", `%${params.search.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map(mapAssignment),
    total: count ?? 0,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function listMaintenance(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  params: MaintenanceListParams,
): Promise<AssetMaintenanceListResult> {
  const organizationId = profile.employee.organizationId;
  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;

  let query = fromHrms(supabase, "asset_maintenance")
    .select(
      `
      id, asset_id, vendor_id, maintenance_date, issue, cost, next_service_date,
      maintenance_status, completed_at, notes, created_at,
      assets:asset_id(asset_code, name),
      asset_vendors:vendor_id(name)
    `,
      { count: "exact" },
    )
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("maintenance_date", { ascending: false })
    .range(from, to);

  if (params.assetId) query = query.eq("asset_id", params.assetId);
  if (params.maintenanceStatus) {
    query = query.eq("maintenance_status", params.maintenanceStatus);
  }
  if (params.search?.trim()) {
    query = query.ilike("issue", `%${params.search.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    data: (data ?? []).map(mapMaintenance),
    total: count ?? 0,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function listVendors(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<AssetVendorItem[]> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await fromHrms(supabase, "asset_vendors")
    .select("*")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);

  const { data: assets } = await fromHrms(supabase, "assets")
    .select("vendor_id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null);

  const counts = new Map<string, number>();
  for (const a of assets ?? []) {
    if (!a.vendor_id) continue;
    counts.set(a.vendor_id, (counts.get(a.vendor_id) ?? 0) + 1);
  }

  return (data ?? []).map((row: AssetRow) => ({
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    purchasedAssetsCount: counts.get(row.id) ?? 0,
    updatedAt: row.updated_at,
  }));
}

export async function getAssetsSummary(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<AssetsSummary> {
  const organizationId = profile.employee.organizationId;
  const settings = await getAssetSettings(supabase, organizationId);
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const soon = format(
    addDays(startOfDay(new Date()), settings.warrantyReminderDays),
    "yyyy-MM-dd",
  );

  const assetsResult = await listAssets(supabase, profile, {
    page: 1,
    pageSize: 500,
  });
  const assets = assetsResult.data;

  const categoryMap = new Map<string, number>();
  const deptMap = new Map<string, number>();
  for (const a of assets) {
    const cat = a.categoryName ?? "Uncategorized";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
    const dept = a.departmentName ?? "Unassigned";
    deptMap.set(dept, (deptMap.get(dept) ?? 0) + 1);
  }

  const assignments = await listAssignments(supabase, profile, {
    page: 1,
    pageSize: 8,
    assignmentStatus: "active",
  });

  return {
    totalAssets: assets.length,
    assignedAssets: assets.filter((a) => a.assetStatus === "assigned").length,
    availableAssets: assets.filter((a) => a.assetStatus === "available").length,
    underMaintenance: assets.filter((a) => a.assetStatus === "maintenance").length,
    lostAssets: assets.filter((a) => a.assetStatus === "lost").length,
    warrantyExpiring: assets.filter(
      (a) => a.warrantyExpiry && a.warrantyExpiry >= today && a.warrantyExpiry <= soon,
    ).length,
    assetsByCategory: Array.from(categoryMap.entries()).map(([categoryName, count]) => ({
      categoryName,
      count,
    })),
    assetsByDepartment: Array.from(deptMap.entries()).map(([departmentName, count]) => ({
      departmentName,
      count,
    })),
    recentAssignments: assignments.data,
    warrantyTimeline: assets
      .filter((a) => a.warrantyExpiry)
      .sort((a, b) => (a.warrantyExpiry! > b.warrantyExpiry! ? 1 : -1))
      .slice(0, 8)
      .map((a) => ({
        assetCode: a.assetCode,
        assetName: a.name,
        warrantyExpiry: a.warrantyExpiry!,
      })),
  };
}

export async function getAssetsReports(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<AssetsReportData> {
  const assets = (
    await listAssets(supabase, profile, { page: 1, pageSize: 500 })
  ).data;
  const settings = await getAssetSettings(supabase, profile.employee.organizationId);
  const today = format(startOfDay(new Date()), "yyyy-MM-dd");
  const soon = format(
    addDays(startOfDay(new Date()), settings.warrantyReminderDays),
    "yyyy-MM-dd",
  );

  const returned = await listAssignments(supabase, profile, {
    page: 1,
    pageSize: 100,
    assignmentStatus: "returned",
  });

  const maintenance = await listMaintenance(supabase, profile, {
    page: 1,
    pageSize: 500,
  });

  const monthMap = new Map<string, number>();
  for (const m of maintenance.data) {
    if (m.cost == null) continue;
    const month = m.maintenanceDate.slice(0, 7);
    monthMap.set(month, (monthMap.get(month) ?? 0) + m.cost);
  }

  const deptMap = new Map<string, { count: number; assigned: number }>();
  for (const a of assets) {
    const key = a.departmentName ?? "Unassigned";
    const cur = deptMap.get(key) ?? { count: 0, assigned: 0 };
    cur.count += 1;
    if (a.assetStatus === "assigned") cur.assigned += 1;
    deptMap.set(key, cur);
  }

  return {
    utilization: {
      available: assets.filter((a) => a.assetStatus === "available").length,
      assigned: assets.filter((a) => a.assetStatus === "assigned").length,
      maintenance: assets.filter((a) => a.assetStatus === "maintenance").length,
      other: assets.filter((a) =>
        ["lost", "retired", "disposed"].includes(a.assetStatus),
      ).length,
    },
    departmentWise: Array.from(deptMap.entries()).map(([departmentName, v]) => ({
      departmentName,
      ...v,
    })),
    warrantyExpiry: assets.filter(
      (a) => a.warrantyExpiry && a.warrantyExpiry >= today && a.warrantyExpiry <= soon,
    ),
    maintenanceCost: Array.from(monthMap.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([month, total]) => ({ month, total })),
    lostAssets: assets.filter((a) => a.assetStatus === "lost"),
    returnedAssets: returned.data,
  };
}

export async function getAssetsLookups(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
): Promise<AssetsLookups> {
  const organizationId = profile.employee.organizationId;

  const [categories, vendors, employees, departments, assets] = await Promise.all([
    fromHrms(supabase, "asset_categories")
      .select("id, name, code, description")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name"),
    fromHrms(supabase, "asset_vendors")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "employees")
      .select("id, employee_code, first_name, last_name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .eq("status", "active")
      .order("first_name")
      .limit(500),
    fromHrms(supabase, "departments")
      .select("id, name")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("name"),
    fromHrms(supabase, "assets")
      .select("id, asset_code, name, asset_status")
      .eq("organization_id", organizationId)
      .is("deleted_at", null)
      .order("asset_code"),
  ]);

  if (categories.error) throw new Error(categories.error.message);
  if (vendors.error) throw new Error(vendors.error.message);
  if (employees.error) throw new Error(employees.error.message);
  if (departments.error) throw new Error(departments.error.message);
  if (assets.error) throw new Error(assets.error.message);

  return {
    categories: (categories.data ?? []).map(
      (c: AssetRow): AssetCategoryItem => ({
        id: c.id,
        name: c.name,
        code: c.code,
        description: c.description,
      }),
    ),
    vendors: (vendors.data ?? []).map((v: AssetRow) => ({
      id: v.id,
      label: v.name,
    })),
    employees: (employees.data ?? []).map((e: AssetRow) => ({
      id: e.id,
      label: `${e.employee_code} — ${formatEmployeeName(e.first_name, e.last_name)}`,
    })),
    departments: (departments.data ?? []).map((d: AssetRow) => ({
      id: d.id,
      label: d.name,
    })),
    availableAssets: (assets.data ?? [])
      .filter((a: AssetRow) => a.asset_status === "available")
      .map((a: AssetRow) => ({
        id: a.id,
        label: `${a.asset_code} — ${a.name}`,
      })),
    allAssets: (assets.data ?? []).map((a: AssetRow) => ({
      id: a.id,
      label: `${a.asset_code} — ${a.name}`,
    })),
  };
}

export async function listEmployeeAssets(
  supabase: AuthSupabaseClient,
  organizationId: string,
  employeeId: string,
): Promise<AssetAssignmentItem[]> {
  const { data, error } = await fromHrms(supabase, "asset_assignments")
    .select(
      `
      id, asset_id, employee_id, assigned_date, expected_return_date, returned_date,
      condition_before, condition_after, assignment_status, remarks, return_remarks, created_at,
      assets:asset_id(asset_code, name, asset_categories:category_id(name)),
      employees:employee_id(employee_code, first_name, last_name, departments:department_id(name))
    `,
    )
    .eq("organization_id", organizationId)
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("assigned_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAssignment);
}
