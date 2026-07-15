"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";

import { useAuth } from "@/providers/auth-provider";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function CeoDashboardHeader() {
  const { profile } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="shrink-0 rounded-xl border bg-card px-4 py-3 shadow-sm sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-primary uppercase">
            Executive Dashboard
          </p>
          <h1 className="mt-0.5 truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {greetingForHour(now.getHours())}, {profile.employee.firstName}
          </h1>
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
            {profile.organization.name}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="whitespace-nowrap text-sm font-medium">
            {format(now, "EEE, d MMM yyyy")}
          </p>
          <p className="whitespace-nowrap text-xs text-muted-foreground">
            {format(now, "hh:mm a")}
          </p>
        </div>
      </div>
    </section>
  );
}
