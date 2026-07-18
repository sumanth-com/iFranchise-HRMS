"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { EmployeeGreeting } from "@/types/employee-dashboard";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function EmployeeDashboardHeader({ greeting }: { greeting: EmployeeGreeting }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const salutation = now ? greetingForHour(now.getHours()) : "Welcome";
  const dateLabel = now
    ? now.toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";
  const timeLabel = now
    ? now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    : "";

  const subtitle =
    [greeting.designation, greeting.departmentName].filter(Boolean).join(" · ") ||
    greeting.employeeCode;

  return (
    <section className="relative w-full shrink-0 overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 px-5 py-5 shadow-sm lg:px-6 lg:py-6">
      <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-14 shrink-0 border-2 border-background shadow-sm">
            {greeting.avatarUrl ? (
              <AvatarImage src={greeting.avatarUrl} alt={greeting.fullName} />
            ) : null}
            <AvatarFallback className="text-base font-semibold">
              {initials(greeting.fullName) || "EE"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight lg:text-3xl">
              {salutation}, {greeting.firstName}
            </h1>
            <p className="mt-1 truncate text-sm text-muted-foreground lg:text-base">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarDays className="size-5" />
          </span>
          <div className="text-right">
            <p className="whitespace-nowrap text-sm font-medium">{dateLabel || "\u00A0"}</p>
            <p className="flex items-center justify-end gap-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              <Clock className="size-3" />
              {timeLabel}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
