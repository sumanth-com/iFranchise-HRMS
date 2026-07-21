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
    <section className="relative w-full shrink-0 overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-primary/5 px-6 py-7 shadow-sm md:px-8 md:py-8 lg:px-10 lg:py-9">
      <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/4 size-32 rounded-full bg-primary/5 blur-2xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <Avatar className="size-16 shrink-0 border-2 border-background shadow-md md:size-[4.5rem]">
            {greeting.avatarUrl ? (
              <AvatarImage src={greeting.avatarUrl} alt={greeting.fullName} />
            ) : null}
            <AvatarFallback className="text-base font-semibold">
              {initials(greeting.fullName) || "EE"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl lg:text-[2rem] lg:leading-tight">
              {salutation}, {greeting.firstName}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground md:text-base">
              {subtitle}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary md:size-12">
            <CalendarDays className="size-5 md:size-[1.35rem]" />
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
