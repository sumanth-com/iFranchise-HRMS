import { formatHoursLabel } from "@/lib/employee/attendance-format";
import type { ManagerAttendanceMonthSummary } from "@/types/manager-self-attendance";
import { cn } from "@/lib/utils";

type Props = {
  summary: ManagerAttendanceMonthSummary;
  className?: string;
  /** Sidebar stack beside calendar (My Attendance). Default is a responsive grid row. */
  layout?: "grid" | "sidebar";
};

const CARDS: {
  key: keyof ManagerAttendanceMonthSummary;
  label: string;
  hint: string;
  sidebarHint: string;
  format?: (value: number | string | null) => string;
}[] = [
  {
    key: "present",
    label: "Present",
    hint: "Days marked present",
    sidebarHint: "Present days",
  },
  {
    key: "absent",
    label: "Absent",
    hint: "Missed days",
    sidebarHint: "Missed days",
  },
  {
    key: "late",
    label: "Late",
    hint: "Late check-ins",
    sidebarHint: "Late check-ins",
  },
  {
    key: "averageWorkingHours",
    label: "Avg Hours",
    hint: "Average working time",
    sidebarHint: "Avg work time",
    format: (value) => formatHoursLabel(Number(value ?? 0)),
  },
];

export function ManagerProfileSummaryCards({
  summary,
  className,
  layout = "grid",
}: Props) {
  const isSidebar = layout === "sidebar";

  return (
    <section
      className={cn(
        isSidebar
          ? "flex h-full min-h-0 w-full flex-col gap-2"
          : "grid grid-cols-2 gap-3 lg:grid-cols-4",
        className,
      )}
    >
      {CARDS.map((card) => {
        const raw = summary[card.key];
        const display = card.format ? card.format(raw) : String(raw ?? 0);

        return (
          <div
            key={card.key}
            className={cn(
              "rounded-xl border bg-card shadow-sm transition-colors",
              isSidebar
                ? "flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-3 text-center"
                : "px-5 py-4",
            )}
          >
            <p
              className={cn(
                "tracking-wide text-muted-foreground",
                isSidebar ? "text-xs font-semibold uppercase tracking-wider" : "text-[11px] font-medium",
              )}
            >
              {card.label}
            </p>
            <p
              className={cn(
                "font-bold tracking-tight tabular-nums",
                isSidebar ? "mt-1 text-2xl leading-tight" : "mt-2 text-2xl font-semibold",
                card.key === "absent" && Number(raw) > 0 && "text-red-600 dark:text-red-400",
              )}
            >
              {display}
            </p>
            <p
              className={cn(
                "leading-snug text-muted-foreground",
                isSidebar ? "mt-1 text-xs" : "mt-0.5 text-[11px]",
              )}
            >
              {isSidebar ? card.sidebarHint : card.hint}
            </p>
          </div>
        );
      })}
    </section>
  );
}
