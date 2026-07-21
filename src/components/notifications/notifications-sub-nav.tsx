"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import {
  NOTIFICATIONS_SUB_NAV,
  canManageNotificationSettings,
  canManageNotifications,
} from "@/lib/notifications/constants";
import { cn } from "@/lib/utils";

type Props = {
  permissionCodes: string[];
};

export function NotificationsSubNav({ permissionCodes }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hubTab = searchParams.get("tab");
  const canManage = canManageNotifications(permissionCodes);
  const canSettings = canManageNotificationSettings(permissionCodes);

  const items = NOTIFICATIONS_SUB_NAV.filter((item) => {
    if ("admin" in item && item.admin) {
      return canManage || canSettings;
    }
    return true;
  });

  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 shadow-sm">
      {items.map((item) => {
        const isHubItem = item.href.includes("tab=");
        const isActive = isHubItem
          ? pathname === "/dashboard/notifications" &&
            (item.href.includes("tab=team")
              ? hubTab === "team"
              : hubTab !== "team")
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
