import { redirect } from "next/navigation";

import { PAYROLL_ROUTES } from "@/lib/payroll/constants";

export default function PayslipsIndexPage() {
  redirect(PAYROLL_ROUTES.payslipHistory);
}
