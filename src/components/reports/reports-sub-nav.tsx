"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname } from "next/navigation";

import { REPORTS_ROUTES, REPORTS_SUB_NAV } from "@/lib/reports/constants";
import { remapSubNavItems } from "@/lib/navigation/remap-sub-nav";
import { cn } from "@/lib/utils";

type ReportsSubNavProps = {
  basePath?: string;
  items?: ReadonlyArray<{ title: string; href: string }>;
};

export function ReportsSubNav({
  basePath = REPORTS_ROUTES.dashboard,
  items,
}: ReportsSubNavProps) {
  const pathname = usePathname();
  const navItems = remapSubNavItems(
    items ?? REPORTS_SUB_NAV,
    REPORTS_ROUTES.dashboard,
    basePath,
  );

  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center justify-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="Reports sections"
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
