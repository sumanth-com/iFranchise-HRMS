"use client";

import { CalendarRange } from "lucide-react";
import Link from "next/link";

import { CEO_ROUTES } from "@/lib/ceo/constants";
import type { CeoKpis, CeoRecruitmentOverview } from "@/types/ceo-dashboard";
import { cn } from "@/lib/utils";

type Stat = { label: string; value: string; tone?: string };

export function CeoDashboardSnapshot({
  kpis,
  recruitment,
}: {
  kpis: CeoKpis;
  recruitment: CeoRecruitmentOverview;
}) {
  const netChange = kpis.newJoiners - kpis.employeesExiting;

  const stats: Stat[] = [
    {
      label: "New joiners",
      value: String(kpis.newJoiners),
      tone: kpis.newJoiners > 0 ? "text-emerald-600 dark:text-emerald-400" : undefined,
    },
    {
      label: "Exits",
      value: String(kpis.employeesExiting),
      tone: kpis.employeesExiting > 0 ? "text-destructive" : undefined,
    },
    {
      label: "Net change",
      value: `${netChange > 0 ? "+" : ""}${netChange}`,
      tone:
        netChange > 0
          ? "text-emerald-600 dark:text-emerald-400"
          : netChange < 0
            ? "text-destructive"
            : undefined,
    },
    {
      label: "Hires closed",
      value: String(recruitment.hiringThisMonth),
    },
  ];

  return (
    <section aria-label="This month at a glance" className="w-full shrink-0">
      <Link
        href={CEO_ROUTES.organization}
        className="flex min-w-0 items-center gap-4 rounded-xl border bg-card px-4 py-3 shadow-sm transition-colors hover:border-primary/30 hover:bg-primary/[0.02]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
          <CalendarRange className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            This month · workforce movement
          </p>
          <div className="mt-1.5 flex items-stretch">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={cn(
                  "min-w-0 flex-1 px-4 first:pl-0",
                  index > 0 && "border-l",
                )}
              >
                <p
                  className={cn(
                    "text-xl leading-none font-semibold tabular-nums",
                    stat.tone,
                  )}
                >
                  {stat.value}
                </p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Link>
    </section>
  );
}
