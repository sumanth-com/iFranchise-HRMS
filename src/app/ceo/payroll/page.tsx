import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import { TEAM_PAYROLL_SECTIONS } from "@/lib/payroll/constants";
import { requireCeoPortal } from "@/lib/ceo/read-only-permissions";

export default async function CeoPayrollIndexPage() {
  await requireCeoPortal();
  redirect(`${CEO_ROUTES.payroll}/${TEAM_PAYROLL_SECTIONS.run}`);
}
