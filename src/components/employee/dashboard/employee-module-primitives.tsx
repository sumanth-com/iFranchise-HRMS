import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmployeeStatCard({
  label,
  value,
  icon: Icon,
  accent = "text-foreground",
  iconBg = "bg-muted",
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: string;
  iconBg?: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col justify-between gap-2 rounded-xl border bg-card p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate whitespace-nowrap text-[11px] font-medium leading-snug text-muted-foreground">
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
      <div className="min-w-0">
        <p className={cn("truncate text-xl font-semibold tracking-tight tabular-nums", accent)}>
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
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
    <section className={cn("flex flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm", className)}>
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
  return (
    <div className="flex h-full min-h-[6rem] items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}
