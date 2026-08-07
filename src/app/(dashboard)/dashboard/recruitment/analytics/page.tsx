import { redirect } from "next/navigation";

import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";

export default function AnalyticsPage() {
  redirect(RECRUITMENT_ROUTES.dashboard);
}
