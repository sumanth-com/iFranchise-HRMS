import { redirect } from "next/navigation";

import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";

export default function SuperAdminOrganizationIndexPage() {
  redirect(`${SYSTEM_ADMIN_ROUTES.organization}/profile`);
}
