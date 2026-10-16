import { redirect } from "next/navigation";

import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

/** Promotions self-service entry removed; keep URL bookmark-safe. */
export default function SuperAdminGoalsPromotionsRedirectPage() {
  redirect(SYSTEM_ADMIN_ROUTES.goals);
}
