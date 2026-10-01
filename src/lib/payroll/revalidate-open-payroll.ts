import { revalidatePath } from "next/cache";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import {
  payrollTeamSectionPath,
  TEAM_PAYROLL_SECTIONS,
} from "@/lib/payroll/constants";

/** Invalidate open Team Payroll runs after attendance or leave facts change. */
export function revalidateOpenPayrollPaths() {
  revalidatePath(payrollTeamSectionPath(TEAM_PAYROLL_SECTIONS.run));
  revalidatePath(CEO_ROUTES.payrollRun);
  revalidatePath(`/accountant/payroll/${TEAM_PAYROLL_SECTIONS.run}`);
}
