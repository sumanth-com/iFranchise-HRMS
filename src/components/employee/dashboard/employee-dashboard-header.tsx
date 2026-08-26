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
    return <div className="h-[3.25rem] w-[11.5rem] shrink-0" aria-hidden />;
  }

  const timeLabel = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="dashboard-surface flex w-max shrink-0 items-center gap-3.5 rounded-xl border-0 bg-card px-4 py-2.5 dark:shadow-none">
      <div className={employeeDateBadgeClass}>
        <div
          className="bg-gradient-to-br from-blue-600 to-violet-600 px-1 py-1 text-[10px] font-bold tracking-[0.14em] text-white uppercase"
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
          className="whitespace-nowrap text-sm font-semibold tracking-tight text-foreground"
          suppressHydrationWarning
        >
          {format(now, "EEEE")}
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
  const showWave = salutation !== "Welcome";

  return (
    <section
      className={cn(
        "dashboard-surface relative w-full shrink-0 overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-card via-card to-violet-500/[0.06] px-6 py-7 md:px-8 md:py-8 lg:px-10 lg:py-9 dark:shadow-none",
      )}
    >
      <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-gradient-to-br from-blue-500/15 to-violet-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/4 size-32 rounded-full bg-violet-500/10 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 inline-flex items-center rounded-full bg-gradient-to-r from-blue-600/10 to-violet-600/10 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-violet-700 dark:text-violet-300">
            {resolvedSubtitle}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl lg:text-[2rem] lg:leading-tight">
            {salutation}
            {showWave ? (
              <span className="ml-1.5" aria-hidden>
                👋
              </span>
            ) : null}
            <span className="text-muted-foreground/40">,</span>{" "}
            <span className="bg-gradient-to-r from-blue-700 to-violet-700 bg-clip-text text-transparent dark:from-blue-400 dark:to-violet-400">
              {greeting.firstName}
            </span>
          </h1>
        </div>
        <HeaderDateWidget now={now} />
      </div>
    </section>
  );
}
