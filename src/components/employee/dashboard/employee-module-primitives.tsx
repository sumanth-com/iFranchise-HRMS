"use client";

import Link from "next/link";
import { CalendarDays, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Employee dashboard surfaces — borderless soft lift in light mode. */
export const employeeSectionClass =
  "dashboard-surface flex flex-col overflow-hidden rounded-xl border-0 bg-card p-4 dark:shadow-none";

export const employeeStatCardClass =
  "dashboard-surface relative flex h-full min-h-[7.25rem] min-w-0 flex-col overflow-hidden rounded-xl border-0 bg-card p-4 text-left dark:shadow-none";

export const employeeEventRowClass =
  "dashboard-surface flex items-center gap-3 rounded-lg border-0 bg-card px-3 py-2.5 transition-[box-shadow,background-color] dark:shadow-none";

export const employeeEmptyClass =
  "dashboard-surface flex h-full min-h-[6rem] items-center justify-center rounded-lg border-0 border-dashed bg-muted/15 px-4 py-6 text-center text-xs text-muted-foreground dark:bg-white/[0.02] dark:shadow-none";

export const employeeDateBadgeClass =
  "flex w-11 shrink-0 flex-col overflow-hidden rounded-lg bg-card text-center shadow-[0_1px_3px_oklch(0.45_0.02_265/6%)] dark:border dark:border-border/60 dark:shadow-none";

export type EmployeeStatCardTone = "emerald" | "sky" | "violet" | "amber" | "rose";

const STAT_CARD_WAVE: Record<
  EmployeeStatCardTone,
  { soft: string; strong: string }
> = {
  emerald: { soft: "fill-emerald-400/20", strong: "fill-emerald-500/25" },
  sky: { soft: "fill-sky-400/20", strong: "fill-sky-500/25" },
  violet: { soft: "fill-violet-400/20", strong: "fill-violet-500/25" },
  amber: { soft: "fill-amber-400/20", strong: "fill-amber-500/25" },
  rose: { soft: "fill-rose-400/20", strong: "fill-rose-500/25" },
};

const STAT_CARD_HINT: Record<EmployeeStatCardTone, string> = {
  emerald:
    "bg-emerald-500/12 text-emerald-700 ring-emerald-500/15 dark:bg-emerald-400/15 dark:text-emerald-300 dark:ring-emerald-400/20",
  sky: "bg-sky-500/12 text-sky-700 ring-sky-500/15 dark:bg-sky-400/15 dark:text-sky-300 dark:ring-sky-400/20",
  violet:
    "bg-violet-500/12 text-violet-700 ring-violet-500/15 dark:bg-violet-400/15 dark:text-violet-300 dark:ring-violet-400/20",
  amber:
    "bg-amber-500/12 text-amber-800 ring-amber-500/15 dark:bg-amber-400/15 dark:text-amber-300 dark:ring-amber-400/20",
  rose: "bg-rose-500/12 text-rose-700 ring-rose-500/15 dark:bg-rose-400/15 dark:text-rose-300 dark:ring-rose-400/20",
};

function StatCardWave({ tone }: { tone: EmployeeStatCardTone }) {
  const colors = STAT_CARD_WAVE[tone];
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 h-[3.25rem] w-full"
      viewBox="0 0 360 72"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        className={colors.soft}
        d="M0 72V34C48 18 92 12 140 20C196 30 228 52 278 58C318 63 342 56 360 46V72H0Z"
      />
      <path
        className={colors.strong}
        d="M0 72V46C52 36 96 40 148 50C204 62 240 70 292 66C328 63 348 56 360 50V72H0Z"
      />
    </svg>
  );
}

export function EmployeeStatCard({
  label,
  value,
  icon: Icon = CalendarDays,
  accent = "text-foreground",
  iconBg = "bg-muted",
  hint,
  tone,
  href,
  onClick,
  active = false,
  compact = false,
  tall = false,
  showWave = true,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  accent?: string;
  iconBg?: string;
  hint?: string;
  tone?: EmployeeStatCardTone;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  compact?: boolean;
  tall?: boolean;
  showWave?: boolean;
}) {
  const content = (
    <>
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate whitespace-nowrap text-[11px] font-medium leading-none text-muted-foreground">
            {label}
          </p>
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              iconBg,
            )}
          >
            <Icon className={cn("size-4", accent)} />
          </span>
        </div>
        <div className={cn("mt-3 flex min-w-0 flex-1 flex-col justify-end gap-2.5 pb-0.5", compact && "mt-2 gap-2")}>
          <p
            className={cn(
              "truncate text-2xl font-semibold leading-7 tracking-tight tabular-nums",
              accent,
            )}
          >
            {value}
          </p>
          {hint ? (
            <span
              className={cn(
                "inline-flex w-fit max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ring-1 ring-inset",
                tone
                  ? STAT_CARD_HINT[tone]
                  : "bg-muted/70 text-muted-foreground ring-border/60",
              )}
            >
              {hint}
            </span>
          ) : (
            <span className="h-[1.375rem]" aria-hidden>
              {"\u00a0"}
            </span>
          )}
        </div>
      </div>
      {tone && showWave ? <StatCardWave tone={tone} /> : null}
    </>
  );

  const className = cn(
    employeeStatCardClass,
    compact && !tall && "min-h-[6.25rem] p-3",
    tall && "min-h-[9.5rem] h-full p-4",
    "w-full min-w-0 max-w-full",
    (href || onClick) &&
      "cursor-pointer transition-[box-shadow,background-color] duration-150 dark:hover:bg-transparent",
    active && "bg-accent/25 ring-1 ring-primary/30 dark:border-indigo-300/45",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

export function EmployeeSectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  compact = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  compact?: boolean;
}) {
  return (
    <section className={cn(employeeSectionClass, className)}>
      <div className={cn("flex items-start justify-between gap-3", compact ? "mb-2" : "mb-3")}>
        <div className="min-w-0">
          <h2 className={cn("font-semibold tracking-tight", compact ? "text-[13px]" : "text-sm")}>
            {title}
          </h2>
          {description ? (
            <p className={cn("text-muted-foreground", compact ? "mt-0.5 text-[11px]" : "mt-0.5 text-xs")}>
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn("min-w-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

export function EmployeeEmpty({ message }: { message: string }) {
  return <div className={employeeEmptyClass}>{message}</div>;
}
