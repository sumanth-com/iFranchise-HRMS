import { redirect } from "next/navigation";

import { MANAGER_ROUTES } from "@/lib/manager/constants";

/** Promotions admin entry removed from Manager Performance. */
export default function ManagerPerformancePromotionsRedirectPage() {
  redirect(MANAGER_ROUTES.performance);
}
