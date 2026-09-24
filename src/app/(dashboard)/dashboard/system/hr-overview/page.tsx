import { redirect } from "next/navigation";

import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

/** HR Overview is an HR-portal module — not exposed in Super Admin. */
export default function SuperAdminHrOverviewPage() {
  redirect(SYSTEM_ADMIN_ROUTES.overview);
}
