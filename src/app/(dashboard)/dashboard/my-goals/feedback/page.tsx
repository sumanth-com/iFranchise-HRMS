import { EmployeeFeedbackView } from "@/components/employee/goals/employee-feedback-view";
import { fetchMyFeedbackAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function MyFeedbackPage() {
  await requireServerPermission("performance.view");
  const feedback = await fetchMyFeedbackAction();

  return <EmployeeFeedbackView feedback={feedback} />;
}
