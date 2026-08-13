import { EmployeePromotionsView } from "@/components/employee/goals/employee-promotions-view";
import { fetchMyPromotionsAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SuperAdminPromotionsPage() {
  await requireSuperAdminProfile();
  const promotions = await fetchMyPromotionsAction();

  return <EmployeePromotionsView promotions={promotions} />;
}
