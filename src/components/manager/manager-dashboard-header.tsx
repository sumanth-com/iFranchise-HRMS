"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";

import { useAuth } from "@/providers/auth-provider";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function ManagerDashboardHeader() {
  const { profile } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="relative shrink-0 overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 px-5 py-5 shadow-sm lg:px-6 lg:py-6">
      <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          Manager Dashboard
        </p>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="min-w-0 text-2xl font-semibold tracking-tight lg:text-3xl">
            {greetingForHour(now.getHours())}, {profile.employee.firstName}
          </h1>
          <div className="shrink-0 text-right">
            <p className="whitespace-nowrap text-sm font-medium">
              {format(now, "EEEE, d MMMM yyyy")}
            </p>
            <p className="whitespace-nowrap text-xs text-muted-foreground">
              {format(now, "hh:mm a")}
            </p>
          </div>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground lg:text-base">
          See your team&apos;s attendance, leave, and performance at a glance.
        </p>
      </div>
    </section>
  );
}
