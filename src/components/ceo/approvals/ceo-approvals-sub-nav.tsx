"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { usePathname } from "next/navigation";

import { CEO_APPROVALS_SUB_NAV, CEO_ROUTES } from "@/lib/ceo/constants";
import { cn } from "@/lib/utils";

function isApprovalsNavActive(pathname: string, href: string) {
  if (href === CEO_ROUTES.approvals) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CeoApprovalsSubNav() {
  const pathname = usePathname();

  return (
    <div className="flex justify-center">
      <nav
        className="inline-flex flex-wrap items-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
        aria-label="Approval sections"
      >
        {CEO_APPROVALS_SUB_NAV.map((item) => {
          const isActive = isApprovalsNavActive(pathname, item.href);

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
