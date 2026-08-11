import { EmployeeOneOnOnesView } from "@/components/employee/goals/employee-one-on-ones-view";
import { fetchMyOneOnOnesAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function MyOneOnOnesPage() {
  await requireServerPermission("performance.view");
  const meetings = await fetchMyOneOnOnesAction();

  return <EmployeeOneOnOnesView meetings={meetings} />;
}
