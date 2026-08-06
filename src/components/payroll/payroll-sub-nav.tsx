"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PAYROLL_SUB_NAV, SELF_PAYROLL_ROUTES } from "@/lib/payroll/constants";
import { cn } from "@/lib/utils";

export function PayrollSubNav() {
  const pathname = usePathname();
  const isTeamPayroll =
    pathname === SELF_PAYROLL_ROUTES.team || pathname.startsWith(`${SELF_PAYROLL_ROUTES.team}/`);

  const activeSection = isTeamPayroll
    ? pathname === SELF_PAYROLL_ROUTES.team
      ? "dashboard"
      : pathname.slice(SELF_PAYROLL_ROUTES.team.length + 1)
    : "dashboard";

  return (
    <nav className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 shadow-sm">
      {PAYROLL_SUB_NAV.map((item) => {
        const isActive =
          isTeamPayroll &&
          (item.section === activeSection ||
            (item.section === "dashboard" && activeSection === "dashboard"));

        return (
          <Link
            key={item.section}
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
