"use client";

import { format } from "date-fns";
import {
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Plus,
  Search,
  UserPlus,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/common/input";
import { buttonVariants } from "@/components/common/button";
import { DASHBOARD_QUICK_ACTIONS } from "@/lib/dashboard/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { hasPermission } from "@/lib/permissions/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

const ACTION_ICONS = {
  "Add Employee": UserPlus,
  "Apply Leave": CalendarDays,
  "Run Payroll": Wallet,
  "Create Job Opening": BriefcaseBusiness,
} as const;

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function DashboardHeader() {
  const router = useRouter();
  const { profile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const firstName = profile.employee.firstName;
  const greeting = greetingForHour(now.getHours());
  const permissionCodes = profile.permissionCodes;

  const actions = useMemo(
    () =>
      DASHBOARD_QUICK_ACTIONS.filter((action) =>
        hasPermission(permissionCodes, action.permission),
      ),
    [permissionCodes],
  );

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    router.push(`${EMPLOYEE_ROUTES.list}?search=${encodeURIComponent(term)}`);
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight md:text-2xl">
          {greeting}, {firstName}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{format(now, "EEEE, d MMMM yyyy")}</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" />
            {format(now, "hh:mm a")}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form onSubmit={onSearch} className="relative min-w-0 flex-1 sm:w-56 lg:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Quick search employees…"
            className="h-8 pl-8 text-sm"
            aria-label="Quick search employees"
          />
        </form>

        <div className="flex flex-wrap items-center gap-1.5">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.label as keyof typeof ACTION_ICONS] ?? Plus;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "h-8 gap-1.5 px-2.5 text-xs",
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden xl:inline">{action.label}</span>
                <span className="xl:hidden">{action.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
