"use client";

import { format } from "date-fns";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import type { EmployeeGreeting } from "@/types/employee-dashboard";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function HeaderDateWidget({ now }: { now: Date | null }) {
  if (!now) {
    return <div className="h-[3.25rem] w-[17.5rem] shrink-0" aria-hidden />;
  }

  const timeLabel = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex w-max min-w-[17.5rem] shrink-0 items-center gap-3 rounded-xl border bg-card px-3.5 py-2 shadow-sm">
      <div className="w-11 shrink-0 overflow-hidden rounded-lg border border-border shadow-sm">
        <div
          className="bg-foreground py-1 text-center text-[10px] font-bold tracking-[0.16em] text-background uppercase"
          suppressHydrationWarning
        >
          {format(now, "MMM")}
        </div>
        <div
          className="bg-background py-1.5 text-center text-lg font-bold leading-none text-foreground"
          suppressHydrationWarning
        >
          {format(now, "d")}
        </div>
      </div>
      <div className="min-w-0 leading-tight">
        <p className="whitespace-nowrap text-sm font-medium text-foreground" suppressHydrationWarning>
          {format(now, "EEEE")}, {format(now, "MMMM d, yyyy")}
        </p>
        <p
          className="mt-0.5 flex items-center gap-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground"
          suppressHydrationWarning
        >
          <Clock className="size-3 shrink-0" />
          {timeLabel}
        </p>
      </div>
    </div>
  );
}

export function EmployeeDashboardHeader({
  greeting,
  subtitle,
}: {
  greeting: EmployeeGreeting;
  subtitle?: string;
}) {
  const { isSystemAdminPortal } = useSidebarNavigation();
  const resolvedSubtitle =
    subtitle ??
    (isSystemAdminPortal ? "Super Admin · System Administration" : "Employee Portal");

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const salutation = now ? greetingForHour(now.getHours()) : "Welcome";

  return (
    <section className="relative w-full shrink-0 overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 px-6 py-7 shadow-sm md:px-8 md:py-8 lg:px-10 lg:py-9">
      <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/4 size-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl lg:text-[2rem] lg:leading-tight">
            {salutation}, {greeting.firstName}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground md:text-base">
            {resolvedSubtitle}
          </p>
        </div>
        <HeaderDateWidget now={now} />
      </div>
    </section>
  );
}
