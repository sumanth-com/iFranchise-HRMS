import { redirect } from "next/navigation";

import { HR_HUB_ROUTES } from "@/lib/dashboard/hr-hub-routes";

/** Promotions self-service entry removed; keep URL bookmark-safe. */
export default function HrMyGoalsPromotionsRedirectPage() {
  redirect(HR_HUB_ROUTES.myGoals);
}
