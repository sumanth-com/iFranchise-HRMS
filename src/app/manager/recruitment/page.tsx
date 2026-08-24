import { redirect } from "next/navigation";

import { MANAGER_ROUTES } from "@/lib/manager/constants";

export default function ManagerRecruitmentDashboardPage() {
  redirect(MANAGER_ROUTES.recruitmentJobs);
}
