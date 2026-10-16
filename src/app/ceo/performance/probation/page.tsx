import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import { TEAM_PAYROLL_SECTIONS } from "@/lib/payroll/constants";

/** Probation & Confirmation lives under Team Payroll. */
export default function CeoPerformanceProbationRedirectPage() {
  redirect(`${CEO_ROUTES.payroll}/${TEAM_PAYROLL_SECTIONS.probation}`);
}
