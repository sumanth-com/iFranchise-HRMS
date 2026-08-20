"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type SubNavItem = {
  title: string;
  href: string;
};

export function MyPerformanceSubNav({
  items,
  rootHref,
}: {
  items: readonly SubNavItem[];
  rootHref: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center justify-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="My performance sections"
      >
        {items.map((item) => {
          const isGoalsRoot = item.href === rootHref;
          const isActive = isGoalsRoot
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
    </div>
  );
}
