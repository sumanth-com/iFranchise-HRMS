"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname } from "next/navigation";

import { SYSTEM_ADMIN_ROUTES } from "@/lib/system-admin/constants";
import { cn } from "@/lib/utils";

const SUPER_ADMIN_NOTIFICATIONS_SUB_NAV = [
  { title: "Notification Center", href: SYSTEM_ADMIN_ROUTES.notificationsCenter },
  { title: "History", href: SYSTEM_ADMIN_ROUTES.notificationsHistory },
] as const;

export function SuperAdminNotificationsSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 shadow-sm">
      {SUPER_ADMIN_NOTIFICATIONS_SUB_NAV.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

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
