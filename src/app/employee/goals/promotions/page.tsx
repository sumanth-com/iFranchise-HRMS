import { EmployeePromotionsView } from "@/components/employee/goals/employee-promotions-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { fetchMyPromotionsAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function EmployeePromotionsPage() {
  await requireServerAnyPermission([PORTAL_PERMISSIONS.employee]);
  const promotions = await fetchMyPromotionsAction();

  return <EmployeePromotionsView promotions={promotions} />;
}
