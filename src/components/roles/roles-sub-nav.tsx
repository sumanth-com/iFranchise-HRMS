"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ROLES_SUB_NAV } from "@/lib/roles/constants";
import { cn } from "@/lib/utils";

export function RolesSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center justify-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="Roles and access sections"
      >
        {ROLES_SUB_NAV.map((item) => {
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
