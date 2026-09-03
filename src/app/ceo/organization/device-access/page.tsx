import { DeviceAccessManagement } from "@/components/organization/device-access-management";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";
import { canManageDeviceAccess } from "@/lib/device-access/access";
import { listDeviceAccessEmployees } from "@/lib/device-access/queries";
import { createClient } from "@/lib/supabase/server";

export default async function CeoDeviceAccessPage() {
  const profile = await requireCeoPortal();
  const supabase = await createClient();
  const employees = await listDeviceAccessEmployees(
    supabase,
    profile.employee.organizationId,
  );

  return (
    <DeviceAccessManagement
      employees={employees}
      canManage={canManageDeviceAccess(profile.permissionCodes)}
    />
  );
}
