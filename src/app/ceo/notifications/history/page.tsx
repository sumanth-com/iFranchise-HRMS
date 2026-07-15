import { redirect } from "next/navigation";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import { PORTAL_PERMISSIONS } from "@/lib/auth/portals";
import { requireServerPermission } from "@/lib/permissions/server";

export default async function CeoNotificationHistoryPage() {
  await requireServerPermission(PORTAL_PERMISSIONS.ceo);
  redirect(CEO_ROUTES.notifications);
}
