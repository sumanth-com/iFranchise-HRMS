import QRCode from "qrcode";

import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import { ASSET_IMAGE_BUCKET, ASSETS_ROUTES } from "@/lib/assets/constants";
import { notifyEmployee } from "@/lib/notifications/services/notification-service";
import {
  getAssetSettings,
  nextAssetCode,
} from "@/lib/assets/services/asset-settings";
import { emptyToNull, fromHrms } from "@/lib/assets/services/assets-utils";
import type {
  AssetFormValues,
  AssignAssetValues,
  MaintenanceFormValues,
  ReturnAssetValues,
  TransferAssetValues,
  VendorFormValues,
} from "@/lib/validations/assets";

async function buildQrPayload(assetCode: string, name: string) {
  return JSON.stringify({ type: "ifranchise-asset", assetCode, name });
}

export async function createAsset(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: AssetFormValues,
  imageFile?: File | null,
): Promise<string> {
  const organizationId = profile.employee.organizationId;
  const settings = await getAssetSettings(supabase, organizationId);
  const assetCode = await nextAssetCode(supabase, organizationId, settings.assetPrefix);
  const qrPayload = settings.enableQrCodes
    ? await buildQrPayload(assetCode, input.name)
    : null;

  let imagePath: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop() ?? "jpg";
    imagePath = `${organizationId}/assets/${assetCode}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(ASSET_IMAGE_BUCKET)
      .upload(imagePath, imageFile, {
        upsert: true,
        contentType: imageFile.type || "image/jpeg",
      });
    if (uploadError) throw new Error(uploadError.message);
  }

  const { data, error } = await fromHrms(supabase, "assets")
    .insert({
      organization_id: organizationId,
      asset_code: assetCode,
      name: input.name,
      category_id: input.categoryId || null,
      brand: emptyToNull(input.brand),
      model: emptyToNull(input.model),
      serial_number: emptyToNull(input.serialNumber),
      purchase_date: emptyToNull(input.purchaseDate),
      purchase_cost: input.purchaseCost ?? null,
      warranty_expiry: emptyToNull(input.warrantyExpiry),
      vendor_id: input.vendorId || null,
      asset_status: input.assetStatus === "assigned" ? "available" : input.assetStatus,
      office_location: emptyToNull(input.officeLocation),
      department_id: input.departmentId || null,
      image_path: imagePath,
      qr_payload: qrPayload,
      notes: emptyToNull(input.notes),
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create asset");
  return data.id;
}

export async function updateAsset(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  assetId: string,
  input: AssetFormValues,
  imageFile?: File | null,
): Promise<void> {
  const organizationId = profile.employee.organizationId;
  const settings = await getAssetSettings(supabase, organizationId);

  const { data: existing, error: existingError } = await fromHrms(supabase, "assets")
    .select("id, asset_code, asset_status, current_assignment_id")
    .eq("id", assetId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Asset not found");

  let imagePath: string | undefined;
  if (imageFile && imageFile.size > 0) {
    const ext = imageFile.name.split(".").pop() ?? "jpg";
    imagePath = `${organizationId}/assets/${existing.asset_code}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(ASSET_IMAGE_BUCKET)
      .upload(imagePath, imageFile, {
        upsert: true,
        contentType: imageFile.type || "image/jpeg",
      });
    if (uploadError) throw new Error(uploadError.message);
  }

  const nextStatus =
    existing.current_assignment_id && input.assetStatus === "available"
      ? existing.asset_status
      : input.assetStatus;

  const qrPayload = settings.enableQrCodes
    ? await buildQrPayload(existing.asset_code, input.name)
    : null;

  const { error } = await fromHrms(supabase, "assets")
    .update({
      name: input.name,
      category_id: input.categoryId || null,
      brand: emptyToNull(input.brand),
      model: emptyToNull(input.model),
      serial_number: emptyToNull(input.serialNumber),
      purchase_date: emptyToNull(input.purchaseDate),
      purchase_cost: input.purchaseCost ?? null,
      warranty_expiry: emptyToNull(input.warrantyExpiry),
      vendor_id: input.vendorId || null,
      asset_status: nextStatus,
      office_location: emptyToNull(input.officeLocation),
      department_id: input.departmentId || null,
      ...(imagePath ? { image_path: imagePath } : {}),
      qr_payload: qrPayload,
      notes: emptyToNull(input.notes),
      updated_by: profile.userId,
    })
    .eq("id", assetId);

  if (error) throw new Error(error.message);
}

export async function deleteAsset(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  assetId: string,
): Promise<void> {
  const { data: asset, error: findError } = await fromHrms(supabase, "assets")
    .select("id, asset_status, current_assignment_id")
    .eq("id", assetId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (findError) throw new Error(findError.message);
  if (!asset) throw new Error("Asset not found");
  if (asset.current_assignment_id || asset.asset_status === "assigned") {
    throw new Error("Return the asset before deleting it");
  }

  const { error } = await fromHrms(supabase, "assets")
    .update({
      deleted_at: new Date().toISOString(),
      asset_status: "disposed",
      updated_by: profile.userId,
    })
    .eq("id", assetId);

  if (error) throw new Error(error.message);
}

export async function assignAsset(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: AssignAssetValues,
): Promise<string> {
  const organizationId = profile.employee.organizationId;

  const { data: asset, error: assetError } = await fromHrms(supabase, "assets")
    .select("id, asset_status, current_assignment_id, department_id")
    .eq("id", input.assetId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (assetError) throw new Error(assetError.message);
  if (!asset) throw new Error("Asset not found");
  if (asset.asset_status !== "available" || asset.current_assignment_id) {
    throw new Error("Asset is not available for assignment");
  }

  const { data: employee, error: empError } = await fromHrms(supabase, "employees")
    .select("id, department_id")
    .eq("id", input.employeeId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (empError) throw new Error(empError.message);
  if (!employee) throw new Error("Employee not found");

  const { data: assignment, error } = await fromHrms(supabase, "asset_assignments")
    .insert({
      organization_id: organizationId,
      asset_id: input.assetId,
      employee_id: input.employeeId,
      assigned_date: input.assignedDate,
      expected_return_date: emptyToNull(input.expectedReturnDate),
      condition_before: input.conditionBefore,
      assignment_status: "active",
      remarks: emptyToNull(input.remarks),
      assigned_by: profile.userId,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !assignment) throw new Error(error?.message ?? "Failed to assign asset");

  const { error: updateError } = await fromHrms(supabase, "assets")
    .update({
      asset_status: "assigned",
      current_assignment_id: assignment.id,
      department_id: employee.department_id ?? asset.department_id,
      updated_by: profile.userId,
    })
    .eq("id", input.assetId);

  if (updateError) throw new Error(updateError.message);

  const { data: assetRow } = await fromHrms(supabase, "assets")
    .select("name")
    .eq("id", input.assetId)
    .maybeSingle();

  await notifyEmployee(supabase, {
    organizationId,
    employeeId: input.employeeId,
    title: "Asset assigned",
    message: `Asset ${assetRow?.name ?? "item"} has been assigned to you.`,
    notificationType: "asset_assigned",
    module: "assets",
    priority: "medium",
    actionUrl: ASSETS_ROUTES.assignments,
    sourceEventKey: `asset_assigned:${assignment.id}`,
    templateKey: "asset_assigned",
    templateVariables: { assetName: assetRow?.name ?? "Asset" },
    createdBy: profile.userId,
  });

  return assignment.id;
}

export async function returnAsset(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: ReturnAssetValues,
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  const { data: assignment, error } = await fromHrms(supabase, "asset_assignments")
    .select("id, asset_id, employee_id, assignment_status")
    .eq("id", input.assignmentId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!assignment) throw new Error("Assignment not found");
  if (assignment.assignment_status !== "active") {
    throw new Error("Assignment is no longer active");
  }

  const { error: updateAssignmentError } = await fromHrms(supabase, "asset_assignments")
    .update({
      assignment_status: input.markAs,
      returned_date: input.returnedDate,
      condition_after: input.conditionAfter,
      return_remarks: emptyToNull(input.returnRemarks),
      returned_by: profile.userId,
      updated_by: profile.userId,
    })
    .eq("id", input.assignmentId);

  if (updateAssignmentError) throw new Error(updateAssignmentError.message);

  const nextAssetStatus =
    input.markAs === "lost" ? "lost" : input.markAs === "damaged" ? "maintenance" : "available";

  const { error: assetError } = await fromHrms(supabase, "assets")
    .update({
      asset_status: nextAssetStatus,
      current_assignment_id: null,
      updated_by: profile.userId,
    })
    .eq("id", assignment.asset_id);

  if (assetError) throw new Error(assetError.message);

  const { data: assetRow } = await fromHrms(supabase, "assets")
    .select("name")
    .eq("id", assignment.asset_id)
    .maybeSingle();

  if (assignment.employee_id) {
    await notifyEmployee(supabase, {
      organizationId,
      employeeId: assignment.employee_id,
      title: "Asset returned",
      message: `Asset ${assetRow?.name ?? "item"} has been returned.`,
      notificationType: "asset_returned",
      module: "assets",
      priority: "low",
      actionUrl: ASSETS_ROUTES.assignments,
      sourceEventKey: `asset_returned:${input.assignmentId}`,
      templateKey: "asset_returned",
      templateVariables: { assetName: assetRow?.name ?? "Asset" },
      createdBy: profile.userId,
    });
  }
}

export async function transferAsset(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: TransferAssetValues,
): Promise<string> {
  const organizationId = profile.employee.organizationId;

  const { data: current, error } = await fromHrms(supabase, "asset_assignments")
    .select("id, asset_id, assignment_status")
    .eq("id", input.assignmentId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!current || current.assignment_status !== "active") {
    throw new Error("Active assignment not found");
  }

  await fromHrms(supabase, "asset_assignments")
    .update({
      assignment_status: "transferred",
      returned_date: input.assignedDate,
      returned_by: profile.userId,
      updated_by: profile.userId,
    })
    .eq("id", current.id);

  const { data: next, error: nextError } = await fromHrms(supabase, "asset_assignments")
    .insert({
      organization_id: organizationId,
      asset_id: current.asset_id,
      employee_id: input.toEmployeeId,
      assigned_date: input.assignedDate,
      expected_return_date: emptyToNull(input.expectedReturnDate),
      condition_before: input.conditionBefore,
      assignment_status: "active",
      remarks: emptyToNull(input.remarks),
      assigned_by: profile.userId,
      transferred_from_assignment_id: current.id,
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (nextError || !next) throw new Error(nextError?.message ?? "Transfer failed");

  const { data: employee } = await fromHrms(supabase, "employees")
    .select("department_id")
    .eq("id", input.toEmployeeId)
    .maybeSingle();

  await fromHrms(supabase, "assets")
    .update({
      asset_status: "assigned",
      current_assignment_id: next.id,
      department_id: employee?.department_id ?? null,
      updated_by: profile.userId,
    })
    .eq("id", current.asset_id);

  return next.id;
}

export async function createMaintenance(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: MaintenanceFormValues,
): Promise<string> {
  const organizationId = profile.employee.organizationId;

  const { data, error } = await fromHrms(supabase, "asset_maintenance")
    .insert({
      organization_id: organizationId,
      asset_id: input.assetId,
      vendor_id: input.vendorId || null,
      maintenance_date: input.maintenanceDate,
      issue: input.issue,
      cost: input.cost ?? null,
      next_service_date: emptyToNull(input.nextServiceDate),
      maintenance_status: input.maintenanceStatus,
      completed_at:
        input.maintenanceStatus === "completed" ? new Date().toISOString() : null,
      notes: emptyToNull(input.notes),
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create maintenance");

  if (input.maintenanceStatus !== "completed" && input.maintenanceStatus !== "cancelled") {
    await fromHrms(supabase, "assets")
      .update({
        asset_status: "maintenance",
        updated_by: profile.userId,
      })
      .eq("id", input.assetId)
      .eq("organization_id", organizationId);
  }

  return data.id;
}

export async function updateMaintenanceStatus(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  maintenanceId: string,
  maintenanceStatus: MaintenanceFormValues["maintenanceStatus"],
): Promise<void> {
  const organizationId = profile.employee.organizationId;

  const { data: row, error } = await fromHrms(supabase, "asset_maintenance")
    .select("id, asset_id")
    .eq("id", maintenanceId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!row) throw new Error("Maintenance record not found");

  const { error: updateError } = await fromHrms(supabase, "asset_maintenance")
    .update({
      maintenance_status: maintenanceStatus,
      completed_at:
        maintenanceStatus === "completed" ? new Date().toISOString() : null,
      updated_by: profile.userId,
    })
    .eq("id", maintenanceId);

  if (updateError) throw new Error(updateError.message);

  if (maintenanceStatus === "completed" || maintenanceStatus === "cancelled") {
    const { data: asset } = await fromHrms(supabase, "assets")
      .select("current_assignment_id")
      .eq("id", row.asset_id)
      .maybeSingle();

    await fromHrms(supabase, "assets")
      .update({
        asset_status: asset?.current_assignment_id ? "assigned" : "available",
        updated_by: profile.userId,
      })
      .eq("id", row.asset_id);
  } else {
    await fromHrms(supabase, "assets")
      .update({
        asset_status: "maintenance",
        updated_by: profile.userId,
      })
      .eq("id", row.asset_id);
  }
}

export async function createVendor(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  input: VendorFormValues,
): Promise<string> {
  const { data, error } = await fromHrms(supabase, "asset_vendors")
    .insert({
      organization_id: profile.employee.organizationId,
      name: input.name,
      contact_person: emptyToNull(input.contactPerson),
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      address: emptyToNull(input.address),
      notes: emptyToNull(input.notes),
      status: "active",
      created_by: profile.userId,
      updated_by: profile.userId,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create vendor");
  return data.id;
}

export async function updateVendor(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  vendorId: string,
  input: VendorFormValues,
): Promise<void> {
  const { error } = await fromHrms(supabase, "asset_vendors")
    .update({
      name: input.name,
      contact_person: emptyToNull(input.contactPerson),
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      address: emptyToNull(input.address),
      notes: emptyToNull(input.notes),
      updated_by: profile.userId,
    })
    .eq("id", vendorId)
    .eq("organization_id", profile.employee.organizationId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
}

export async function deleteVendor(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  vendorId: string,
): Promise<void> {
  const { error } = await fromHrms(supabase, "asset_vendors")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: profile.userId,
    })
    .eq("id", vendorId)
    .eq("organization_id", profile.employee.organizationId);

  if (error) throw new Error(error.message);
}

export async function getAssetQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
  });
}

export async function createSignedAssetImageUrl(
  supabase: AuthSupabaseClient,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(ASSET_IMAGE_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
