import { redirect } from "next/navigation";

import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";

/** Promotions self-service entry removed; keep URL bookmark-safe. */
export default function EmployeePromotionsRedirectPage() {
  redirect(EMPLOYEE_ROUTES.goals);
}
