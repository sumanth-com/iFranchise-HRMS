import { redirect } from "next/navigation";

import { MANAGER_NOTIFICATIONS_ROUTES } from "@/lib/notifications/constants";

export default function ManagerNotificationsPage() {
  redirect(MANAGER_NOTIFICATIONS_ROUTES.center);
}
