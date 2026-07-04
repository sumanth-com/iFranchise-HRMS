"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PAYROLL_SUB_NAV } from "@/lib/payroll/constants";
import { cn } from "@/lib/utils";

export function PayrollSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
      {PAYROLL_SUB_NAV.map((item) => {
        const isActive =
          item.href === "/dashboard/payroll"
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
