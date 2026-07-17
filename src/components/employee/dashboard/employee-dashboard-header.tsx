"use client";

import { useEffect, useState } from "react";

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
    <header className="flex flex-col gap-4 overflow-hidden rounded-2xl border bg-gradient-to-r from-primary/10 via-primary/5 to-card px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-4">
        <Avatar className="size-14 border-2 border-background shadow-sm">
          {greeting.avatarUrl ? (
            <AvatarImage src={greeting.avatarUrl} alt={greeting.fullName} />
          ) : null}
          <AvatarFallback className="text-base font-semibold">
            {initials(greeting.fullName) || "EE"}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {salutation}, {greeting.firstName}
          </h2>
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-0.5">
        <p className="text-sm font-medium">{dateLabel || "\u00A0"}</p>
        <span className="hidden text-muted-foreground sm:inline">·</span>
        <p className="text-sm font-semibold tabular-nums text-primary">{timeLabel}</p>
      </div>
    </header>
  );
}
