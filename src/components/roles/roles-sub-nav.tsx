"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname } from "next/navigation";

import { ROLES_SUB_NAV } from "@/lib/roles/constants";
import { cn } from "@/lib/utils";

type NavItem = { title: string; href: string };

type Props = {
  items?: readonly NavItem[];
  rootHref?: string;
};

export function RolesSubNav({ items = ROLES_SUB_NAV, rootHref }: Props) {
  const pathname = usePathname();
  const root = rootHref ?? items[0]?.href;

  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center justify-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="Roles and access sections"
      >
        {items.map((item) => {
          const isRoot = Boolean(root) && item.href === root;
          const isActive = isRoot
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
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
