import { redirect } from "next/navigation";

import { NOTIFICATIONS_ROUTES } from "@/lib/notifications/constants";
import { hubListUrl } from "@/lib/dashboard/hub-paths";

type NotificationCenterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CENTER_TABS = new Set(["all", "unread"]);

export default async function NotificationCenterPage({
  searchParams,
}: NotificationCenterPageProps) {
  const rawParams = await searchParams;
  const filters: Record<string, string | undefined> = {};

  const oldTab = typeof rawParams.tab === "string" ? rawParams.tab : undefined;
  if (oldTab && CENTER_TABS.has(oldTab)) {
    filters.centerTab = oldTab;
  }

  Object.entries(rawParams).forEach(([key, value]) => {
    if (key === "tab" || typeof value !== "string") {
      return;
    }
    filters[key] = value;
  });

  redirect(hubListUrl(NOTIFICATIONS_ROUTES.dashboard, filters));
}
