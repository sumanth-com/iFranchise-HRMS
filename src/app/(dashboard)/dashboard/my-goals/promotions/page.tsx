import { EmployeePromotionsView } from "@/components/employee/goals/employee-promotions-view";
import { fetchMyPromotionsAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function MyPromotionsPage() {
  await requireServerPermission("performance.view");
  const promotions = await fetchMyPromotionsAction();

  return <EmployeePromotionsView promotions={promotions} />;
}
