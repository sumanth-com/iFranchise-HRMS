import { redirect } from "next/navigation";

import { TEAM_PAYROLL_SECTIONS, payrollHubUrl } from "@/lib/payroll/constants";

/** Probation & Confirmation lives under Team Payroll. */
export default function PerformanceProbationRedirectPage() {
  redirect(payrollHubUrl({ tab: "team", section: TEAM_PAYROLL_SECTIONS.probation }));
}
