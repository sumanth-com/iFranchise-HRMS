import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";

export default function CeoRecruitmentDashboardPage() {
  redirect(CEO_ROUTES.recruitmentJobs);
}
