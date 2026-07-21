import { redirect } from "next/navigation";

type NotificationCenterPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const CENTER_TABS = new Set(["all", "unread", "read", "archived"]);

export default async function NotificationCenterPage({
  searchParams,
}: NotificationCenterPageProps) {
  const rawParams = await searchParams;
  const params = new URLSearchParams();
  params.set("tab", "my");

  const oldTab = typeof rawParams.tab === "string" ? rawParams.tab : undefined;
  if (oldTab && CENTER_TABS.has(oldTab)) {
    params.set("centerTab", oldTab);
  }

  Object.entries(rawParams).forEach(([key, value]) => {
    if (key === "tab" || typeof value !== "string") {
      return;
    }
    params.set(key, value);
  });

  redirect(`/dashboard/notifications?${params.toString()}`);
}
