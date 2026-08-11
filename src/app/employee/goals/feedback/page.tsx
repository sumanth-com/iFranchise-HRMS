import { EmployeeFeedbackView } from "@/components/employee/goals/employee-feedback-view";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { fetchMyFeedbackAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerAnyPermission } from "@/lib/permissions/server";

export default async function EmployeeFeedbackPage() {
  await requireServerAnyPermission([PORTAL_PERMISSIONS.employee]);
  const feedback = await fetchMyFeedbackAction();

  return <EmployeeFeedbackView feedback={feedback} />;
}
