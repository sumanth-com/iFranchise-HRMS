import { revalidatePath } from "next/cache";

import { CEO_ROUTES } from "@/lib/ceo/constants";

/** Targeted refresh of CEO home KPIs after attendance/leave/approval/employee/recruitment/payroll changes. */
export function revalidateCeoDashboardHome() {
  revalidatePath(CEO_ROUTES.home);
}
