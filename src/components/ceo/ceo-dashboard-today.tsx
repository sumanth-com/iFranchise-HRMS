"use client";

import { CalendarCheck } from "lucide-react";
import Link from "next/link";

import { EmployeeSectionCard } from "@/components/employee/dashboard/employee-module-primitives";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { cn } from "@/lib/utils";
import type { CeoAttendanceOverview } from "@/types/ceo-dashboard";

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-3 py-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          highlight
            ? "mt-1 text-lg font-semibold tabular-nums"
            : "mt-1 text-sm font-semibold tabular-nums"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function CeoDashboardToday({
  attendance,
  className,
}: {
  attendance: CeoAttendanceOverview;
  className?: string;
}) {
  const presentToday = Number(attendance?.presentToday) || 0;
  const lateToday = Number(attendance?.lateToday) || 0;
  const absentToday = Number(attendance?.absentToday) || 0;
  const onLeaveToday = Number(attendance?.onLeaveToday) || 0;
  const onSite = presentToday + lateToday;

  return (
    <EmployeeSectionCard
      title="Today's Workforce"
      description="Who is in, away, or on leave today."
      className={cn("flex flex-col h-full", className)}
      bodyClassName="flex flex-col justify-center min-h-0 flex-1"
      action={
        <Link
          href={CEO_ROUTES.attendance}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/15"
        >
          <CalendarCheck className="size-3" />
          Attendance
        </Link>
      }
    >
      <div className="grid grid-cols-3 divide-x rounded-xl border bg-gradient-to-br from-primary/5 via-card to-card">
        <Stat label="Present" value={String(onSite)} highlight />
        <Stat label="Absent" value={String(absentToday)} />
        <Stat label="On leave" value={String(onLeaveToday)} />
      </div>
    </EmployeeSectionCard>
  );
}
