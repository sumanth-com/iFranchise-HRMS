import Link from "next/link";
import { CalendarPlus, FileText, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmployeeSectionCard } from "@/components/employee/dashboard/employee-module-primitives";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { cn } from "@/lib/utils";

type QuickAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  className: string;
};

const ACTIONS: QuickAction[] = [
  {
    label: "Apply Leave",
    href: `${EMPLOYEE_ROUTES.leave}/new`,
    icon: CalendarPlus,
    className: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    label: "Download Payslip",
    href: EMPLOYEE_ROUTES.payroll,
    icon: Wallet,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    label: "View Documents",
    href: EMPLOYEE_ROUTES.documents,
    icon: FileText,
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
];

export function EmployeeQuickActions() {
  return (
    <EmployeeSectionCard
      title="Quick Actions"
      description="Jump straight to what you need."
      className="shrink-0"
    >
      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group flex flex-col items-center gap-2 rounded-xl border bg-card px-3 py-3.5 text-center shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-transform group-hover:scale-105",
                  action.className,
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-xs font-medium leading-tight">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </EmployeeSectionCard>
  );
}
