"use client";

import Link from "next/link";
import { CalendarDays, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Employee dashboard surfaces — borderless soft lift in light mode. */
export const employeeSectionClass =
  "dashboard-surface flex flex-col overflow-hidden rounded-xl border-0 bg-card p-4 dark:shadow-none";

export const employeeStatCardClass =
  "dashboard-surface flex h-full min-h-[6.75rem] min-w-0 flex-col rounded-xl border-0 bg-card p-3.5 text-left dark:shadow-none";

export const employeeEventRowClass =
  "dashboard-surface flex items-center gap-3 rounded-lg border-0 bg-card px-3 py-2.5 transition-[box-shadow,background-color] dark:shadow-none";

export const employeeEmptyClass =
  "dashboard-surface flex h-full min-h-[6rem] items-center justify-center rounded-lg border-0 border-dashed bg-muted/15 px-4 py-6 text-center text-xs text-muted-foreground dark:bg-white/[0.02] dark:shadow-none";

export const employeeDateBadgeClass =
  "flex w-11 shrink-0 flex-col overflow-hidden rounded-lg bg-card text-center shadow-[0_1px_3px_oklch(0.45_0.02_265/6%)] dark:border dark:border-border/60 dark:shadow-none";

export function EmployeeStatCard({
  label,
  value,
  icon: Icon = CalendarDays,
  accent = "text-foreground",
  iconBg = "bg-muted",
  hint,
  href,
  onClick,
  active = false,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  accent?: string;
  iconBg?: string;
  hint?: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="truncate whitespace-nowrap text-[11px] font-medium leading-none text-foreground/90 dark:text-white">
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
      <div className="mt-3 min-w-0">
        <p className={cn("truncate text-xl font-semibold leading-7 tracking-tight tabular-nums", accent)}>
          {value}
        </p>
        <p className="mt-1 truncate text-[11px] leading-4 text-foreground/80 dark:text-white/90">
          {hint || "\u00a0"}
        </p>
      </div>
    </>
  );

  const className = cn(
    employeeStatCardClass,
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
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(employeeSectionClass, className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
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
