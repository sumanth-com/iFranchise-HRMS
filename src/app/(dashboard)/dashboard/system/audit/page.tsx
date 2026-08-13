import { redirect } from "next/navigation";

import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

/** Super Admin Audit Trail lands on logs — no separate dashboard tab. */
export default function SuperAdminAuditIndexPage() {
  redirect(`${SYSTEM_ADMIN_ROUTES.audit}/logs`);
}
