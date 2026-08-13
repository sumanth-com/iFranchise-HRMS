"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HIRING_SUB_NAV, RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { remapSubNavItems } from "@/lib/navigation/remap-sub-nav";
import { cn } from "@/lib/utils";

type HiringSubNavProps = {
  basePath?: string;
  items?: ReadonlyArray<{ title: string; href: string }>;
};

function isHiringNavActive(pathname: string, href: string, moduleRoot: string) {
  if (href === moduleRoot) {
    return pathname === href;
  }
  if (href === `${moduleRoot}/onboarding`) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HiringSubNav({
  basePath = RECRUITMENT_ROUTES.dashboard,
  items,
}: HiringSubNavProps) {
  const pathname = usePathname();
  const navItems = remapSubNavItems(
    items ?? HIRING_SUB_NAV,
    RECRUITMENT_ROUTES.dashboard,
    basePath,
  );

  return (
    <div className="flex justify-center">
      <nav className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
        {navItems.map((item) => {
          const isActive = isHiringNavActive(pathname, item.href, basePath);

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
