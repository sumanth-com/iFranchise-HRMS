import { redirect } from "next/navigation";

import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";

/**
 * Prefer next.config HTTP redirect for soft-nav safety (React #310).
 * Keep this page as a fallback for direct hits / older deploys.
 */
export default function RecruitmentPage() {
  redirect(RECRUITMENT_ROUTES.jobs);
}
