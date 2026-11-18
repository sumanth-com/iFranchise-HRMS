import Link from "next/link";
import { ArrowRight, CalendarPlus, ReceiptText, Zap } from "lucide-react";

import { employeeSectionClass } from "@/components/employee/dashboard/employee-module-primitives";
import { EMPLOYEE_ROUTES } from "@/lib/employee/constants";
import { cn } from "@/lib/utils";

const ACTIONS = [
  {
    label: "Apply Leave",
    href: `${EMPLOYEE_ROUTES.leave}/new`,
    icon: CalendarPlus,
  },
  {
    label: "Submit Reimbursement",
    href: EMPLOYEE_ROUTES.reimbursements,
    icon: ReceiptText,
  },
] as const;

export function EmployeeQuickActions() {
  return (
    <section className={cn(employeeSectionClass, "shrink-0")}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
        <Zap className="size-4 text-violet-600" aria-hidden />
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="group flex min-h-[5.25rem] min-w-0 flex-col justify-between rounded-xl border border-violet-500/15 bg-violet-500/[0.025] px-3.5 py-3 transition-colors hover:border-violet-500/35 hover:bg-violet-500/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
          >
            <Icon className="size-5 text-violet-700 dark:text-violet-300" aria-hidden />
            <span className="flex min-w-0 items-center justify-between gap-2 text-xs font-semibold leading-tight">
              <span className="min-w-0">{label}</span>
              <ArrowRight className="size-4 shrink-0 text-violet-700 transition-transform group-hover:translate-x-0.5 dark:text-violet-300" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
