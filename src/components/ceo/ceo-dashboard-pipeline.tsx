"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";

import { EmployeeSectionCard } from "@/components/employee/dashboard/employee-module-primitives";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { cn } from "@/lib/utils";
import type { CeoRecruitmentOverview } from "@/types/ceo-dashboard";

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
    <div className="flex flex-col items-center px-2.5 py-3 text-center">
      <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={
          highlight
            ? "mt-1 text-lg font-semibold tabular-nums text-violet-700 dark:text-violet-300"
            : "mt-1 text-sm font-semibold tabular-nums text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

export function CeoDashboardPipeline({
  recruitment,
  className,
}: {
  recruitment: CeoRecruitmentOverview;
  className?: string;
}) {
  const openJobs = Number(recruitment?.openJobs) || 0;
  const candidates = Number(recruitment?.candidates) || 0;
  const interviewsToday = Number(recruitment?.interviewsToday) || 0;
  const offersPending = Number(recruitment?.offersPending) || 0;

  return (
    <EmployeeSectionCard
      title="Hiring Pipeline"
      description="Active talent & candidate flow."
      className={cn("flex flex-col h-full", className)}
      bodyClassName="flex flex-col justify-center min-h-0 flex-1"
      action={
        <Link
          href={CEO_ROUTES.recruitment}
          className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-500/20 transition-colors hover:bg-violet-500/25 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/25 dark:hover:bg-violet-400/25"
        >
          <UserPlus className="size-3" />
          Hiring
        </Link>
      }
    >
      <div className="grid grid-cols-4 divide-x divide-violet-500/10 rounded-xl border border-violet-500/15 bg-gradient-to-br from-violet-500/10 via-card to-card">
        <Stat label="Open Jobs" value={String(openJobs)} highlight />
        <Stat label="Candidates" value={String(candidates)} />
        <Stat label="Interviews" value={String(interviewsToday)} />
        <Stat label="Offers" value={String(offersPending)} />
      </div>
    </EmployeeSectionCard>
  );
}
