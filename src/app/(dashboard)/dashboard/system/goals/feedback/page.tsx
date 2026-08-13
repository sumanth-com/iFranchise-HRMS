import { EmployeeFeedbackView } from "@/components/employee/goals/employee-feedback-view";
import { fetchMyFeedbackAction } from "@/lib/employee/actions/employee-performance-actions";
import { requireSuperAdminProfile } from "@/lib/system-admin/guards";

export default async function SuperAdminFeedbackPage() {
  await requireSuperAdminProfile();
  const feedback = await fetchMyFeedbackAction();

  return <EmployeeFeedbackView feedback={feedback} />;
}
