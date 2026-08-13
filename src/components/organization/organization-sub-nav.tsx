"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ORGANIZATION_ROUTES, ORGANIZATION_SUB_NAV } from "@/lib/organization/constants";
import { remapSubNavItems } from "@/lib/navigation/remap-sub-nav";
import { cn } from "@/lib/utils";

type OrganizationSubNavProps = {
  basePath?: string;
};

export function OrganizationSubNav({
  basePath = ORGANIZATION_ROUTES.dashboard,
}: OrganizationSubNavProps) {
  const pathname = usePathname();
  const items = remapSubNavItems(
    ORGANIZATION_SUB_NAV,
    ORGANIZATION_ROUTES.dashboard,
    basePath,
  );

  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="Organization sections"
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

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
    </div>
  );
}
