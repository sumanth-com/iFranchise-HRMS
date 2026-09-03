"use server";

import { revalidatePath } from "next/cache";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import { canManageDeviceAccess, canViewDeviceAccess } from "@/lib/device-access/access";
import { listDeviceAccessEmployees } from "@/lib/device-access/queries";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import { requireAuthenticatedProfile } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

function revalidateDeviceAccess() {
  revalidatePath(ORGANIZATION_ROUTES.deviceAccess);
  revalidatePath(CEO_ROUTES.organizationDeviceAccess);
}

export async function setEmployeeTabletAccessAction(
  employeeId: string,
  enabled: boolean,
): Promise<ActionResult<{ employeeId: string; enabled: boolean }>> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canManageDeviceAccess(profile.permissionCodes)) {
      return { success: false, message: "You do not have permission to change tablet access." };
    }

    const supabase = await createClient();
    const { error } = await supabase.schema("hrms").rpc("set_employee_tablet_access", {
      p_employee_id: employeeId,
      p_enabled: enabled,
    });

    if (error) {
      return { success: false, message: "Could not update tablet access. Please try again." };
    }

    revalidateDeviceAccess();
    return { success: true, data: { employeeId, enabled } };
  } catch {
    return { success: false, message: "Could not update tablet access. Please try again." };
  }
}

export async function listDeviceAccessEmployeesAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof listDeviceAccessEmployees>>>
> {
  try {
    const profile = await requireAuthenticatedProfile();
    if (!canViewDeviceAccess(profile.permissionCodes)) {
      return { success: false, message: "You do not have permission to view device access." };
    }
    const supabase = await createClient();
    const data = await listDeviceAccessEmployees(
      supabase,
      profile.employee.organizationId,
    );
    return { success: true, data };
  } catch {
    return { success: false, message: "Could not load device access. Please try again." };
  }
}
