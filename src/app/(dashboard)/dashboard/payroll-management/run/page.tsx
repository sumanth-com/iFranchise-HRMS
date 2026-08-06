import { redirect } from "next/navigation";

import {
  payrollHubUrl,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

export default function PayrollRunPage() {
  redirect(payrollHubUrl({ tab: "team", section: TEAM_PAYROLL_SECTIONS.run }));
}
