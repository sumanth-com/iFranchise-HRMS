import { redirect } from "next/navigation";

import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export default function SuperAdminReportsIndexPage() {
  redirect(`${SYSTEM_ADMIN_ROUTES.reports}/attendance`);
}
