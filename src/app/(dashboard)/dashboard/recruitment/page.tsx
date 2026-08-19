import { redirect } from "next/navigation";

import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";

export default function RecruitmentPage() {
  redirect(RECRUITMENT_ROUTES.jobs);
}
