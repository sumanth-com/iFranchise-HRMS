import { DeviceAccessManagement } from "@/components/organization/device-access-management";
import { canManageDeviceAccess } from "@/lib/device-access/access";
import { listDeviceAccessEmployees } from "@/lib/device-access/queries";
import { ORGANIZATION_VIEW_PERMISSIONS } from "@/lib/organization/constants";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

export default async function DeviceAccessPage() {
  const profile = await requireServerAnyPermission([...ORGANIZATION_VIEW_PERMISSIONS]);
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
