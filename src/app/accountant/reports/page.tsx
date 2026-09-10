import { redirect } from "next/navigation";

import { ACCOUNTANT_ROUTES } from "@/lib/accountant/constants";
import { requireAccountantPortal } from "@/lib/accountant/permissions";

export default async function AccountantReportsIndexPage() {
  await requireAccountantPortal();
  redirect(ACCOUNTANT_ROUTES.reportsPayroll);
}
