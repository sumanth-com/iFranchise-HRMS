import Link from "next/link";

import { cn } from "@/lib/utils";

type DashboardMetricCardProps = {
  label: string;
  value: string | number;
  href?: string;
  className?: string;
  compact?: boolean;
};

export function DashboardMetricCard({
  label,
  value,
  href,
  className,
  compact = false,
}: DashboardMetricCardProps) {
  const content = (
    <>
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 font-semibold tracking-tight",
          compact ? "text-lg" : "text-xl",
        )}
      >
        {value}
      </p>
    </>
  );

  const baseClass = cn(
    "rounded-lg border bg-card shadow-sm transition-colors",
    compact ? "px-2.5 py-2" : "px-3 py-2.5",
    href && "hover:border-primary/30 hover:bg-accent/40",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={cn(baseClass, "block")}>
        {content}
      </Link>
    );
  }

  return <div className={baseClass}>{content}</div>;
}

type DashboardPanelProps = {
  title: string;
  subtitle?: string;
  href?: string;
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
};

export function DashboardPanel({
  title,
  subtitle,
  href,
  children,
  className,
  compact = false,
}: DashboardPanelProps) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card shadow-sm",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {href ? (
            <Link href={href} className="text-sm font-medium hover:text-primary">
              {title}
            </Link>
          ) : (
            <h2 className="text-sm font-medium">{title}</h2>
          )}
          {subtitle ? (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function DashboardEmpty({ message }: { message: string }) {
  return <p className="py-2 text-xs text-muted-foreground">{message}</p>;
}
