import { cn } from "@/lib/utils";
import {
  employmentTypeStyleKey,
  formatEmploymentTypeLabel,
} from "@/lib/employees/employment-type-display";

const TYPE_STYLES: Record<string, string> = {
  probation:
    "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20 dark:bg-amber-400/12 dark:text-amber-300 dark:ring-amber-400/25",
  intern:
    "bg-violet-500/10 text-violet-800 ring-1 ring-violet-500/20 dark:bg-violet-400/12 dark:text-violet-300 dark:ring-violet-400/25",
  internship:
    "bg-violet-500/10 text-violet-800 ring-1 ring-violet-500/20 dark:bg-violet-400/12 dark:text-violet-300 dark:ring-violet-400/25",
  contract:
    "bg-slate-500/10 text-slate-800 ring-1 ring-slate-500/20 dark:bg-slate-400/12 dark:text-slate-200 dark:ring-slate-400/25",
  "part time":
    "bg-sky-500/10 text-sky-800 ring-1 ring-sky-500/20 dark:bg-sky-400/12 dark:text-sky-300 dark:ring-sky-400/25",
  "full time":
    "bg-emerald-500/10 text-emerald-800 ring-1 ring-emerald-500/20 dark:bg-emerald-400/12 dark:text-emerald-300 dark:ring-emerald-400/25",
};

function styleForType(name: string | null | undefined) {
  const key = employmentTypeStyleKey(name);
  if (TYPE_STYLES[key]) return TYPE_STYLES[key];
  if (key.includes("probation")) return TYPE_STYLES.probation;
  if (key.includes("intern")) return TYPE_STYLES.intern;
  if (key.includes("contract")) return TYPE_STYLES.contract;
  if (key.includes("part")) return TYPE_STYLES["part time"];
  if (key.includes("full")) return TYPE_STYLES["full time"];
  return "bg-muted text-foreground ring-1 ring-border/60 dark:bg-white/10 dark:text-slate-100 dark:ring-white/15";
}

type EmploymentTypeBadgeProps = {
  typeName: string | null | undefined;
  className?: string;
};

export function EmploymentTypeBadge({ typeName, className }: EmploymentTypeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styleForType(typeName),
        className,
      )}
    >
      {formatEmploymentTypeLabel(typeName)}
    </span>
  );
}
