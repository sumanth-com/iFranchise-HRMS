import { redirect } from "next/navigation";

import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { requireAccountantPortal } from "@/lib/accountant/permissions";
import { TEAM_PAYROLL_SECTIONS } from "@/lib/payroll/constants";

/** Team Payroll index — open the existing Team Payroll module (run tab). */
export default async function AccountantPayrollIndexPage() {
  await requireAccountantPortal();
  redirect(`${ACCOUNTANT_ROUTES.payroll}/${TEAM_PAYROLL_SECTIONS.run}`);
}
