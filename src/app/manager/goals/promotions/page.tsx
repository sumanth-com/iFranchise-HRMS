import { redirect } from "next/navigation";

import { MANAGER_ROUTES } from "@/lib/manager/constants";

/** Promotions self-service entry removed; keep URL bookmark-safe. */
export default function ManagerPromotionsRedirectPage() {
  redirect(MANAGER_ROUTES.goals);
}
