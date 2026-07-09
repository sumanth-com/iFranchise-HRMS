"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  NOTIFICATIONS_ROUTES,
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
        const isActive =
          item.href === NOTIFICATIONS_ROUTES.dashboard
            ? pathname === item.href
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
