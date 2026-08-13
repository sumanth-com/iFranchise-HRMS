import { redirect } from "next/navigation";

import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

/** Timeline is removed from Super Admin audit sub-nav; keep logs as the chronological view. */
export default function SuperAdminAuditTimelineRedirectPage() {
  redirect(`${SYSTEM_ADMIN_ROUTES.audit}/logs`);
}
