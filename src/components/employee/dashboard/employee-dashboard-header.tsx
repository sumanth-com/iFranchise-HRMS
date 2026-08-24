"use client";

import { format } from "date-fns";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { employeeDateBadgeClass } from "@/components/employee/dashboard/employee-module-primitives";
import { useSidebarNavigation } from "@/hooks/use-sidebar-navigation";
import { cn } from "@/lib/utils";
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
    <div className="dashboard-surface flex w-max min-w-[17.5rem] shrink-0 items-center gap-3.5 rounded-xl border-0 bg-card px-4 py-2.5 dark:shadow-none">
      <div className={employeeDateBadgeClass}>
        <div
          className="bg-primary px-1 py-1 text-[10px] font-bold tracking-[0.14em] text-primary-foreground uppercase"
          suppressHydrationWarning
        >
          {format(now, "MMM")}
        </div>
        <div
          className="flex min-h-[2.35rem] items-center justify-center bg-card py-1 text-xl font-bold tabular-nums leading-none text-foreground"
          suppressHydrationWarning
        >
          {format(now, "d")}
        </div>
      </div>
      <div className="min-w-0 leading-tight">
        <p
          className="whitespace-nowrap text-sm font-semibold text-foreground"
          suppressHydrationWarning
        >
          {format(now, "EEEE")}, {format(now, "MMMM d, yyyy")}
        </p>
        <p
          className="mt-1 flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums text-muted-foreground"
          suppressHydrationWarning
        >
          <Clock className="size-3.5 shrink-0 opacity-70" />
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
  const { portalLabel } = useSidebarNavigation();
  // Always match the active portal (HR / Manager / Employee / Executive / Super Admin).
  const resolvedSubtitle = subtitle ?? portalLabel;

  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const salutation = now ? greetingForHour(now.getHours()) : "Welcome";

  return (
    <section
      className={cn(
        "dashboard-surface relative w-full shrink-0 overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-card via-card to-primary/5 px-6 py-7 md:px-8 md:py-8 lg:px-10 lg:py-9 dark:shadow-none",
      )}
    >
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
