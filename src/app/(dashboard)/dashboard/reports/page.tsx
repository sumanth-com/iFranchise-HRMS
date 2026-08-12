import { redirect } from "next/navigation";

import { REPORTS_ROUTES } from "@/lib/reports/constants";

export default function ReportsIndexPage() {
  redirect(REPORTS_ROUTES.attendance);
}
