"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HIRING_SUB_NAV } from "@/lib/recruitment/constants";
import { cn } from "@/lib/utils";

function isHiringNavActive(pathname: string, href: string) {
  if (href === "/dashboard/recruitment") {
    return pathname === href;
  }
  if (href === "/dashboard/recruitment/onboarding") {
    return pathname === href || pathname.startsWith(`${href}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HiringSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex justify-center">
      <nav className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm">
        {HIRING_SUB_NAV.map((item) => {
          const isActive = isHiringNavActive(pathname, item.href);

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
