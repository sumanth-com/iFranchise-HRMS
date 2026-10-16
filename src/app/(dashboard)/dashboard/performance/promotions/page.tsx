import { redirect } from "next/navigation";

import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";

/** Promotions module replaced by Probation & Confirmation. */
export default function PromotionsRedirectPage() {
  redirect(PERFORMANCE_ROUTES.probation);
}
