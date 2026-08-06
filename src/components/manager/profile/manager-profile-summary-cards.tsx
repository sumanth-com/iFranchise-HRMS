import { formatHoursLabel } from "@/lib/manager/services/manager-self-attendance-service";
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
  format?: (value: number | string | null) => string;
}[] = [
  {
    key: "present",
    label: "Present",
    hint: "Days marked present",
  },
  {
    key: "absent",
    label: "Absent",
    hint: "Missed days",
  },
  {
    key: "late",
    label: "Late",
    hint: "Late check-ins",
  },
  {
    key: "averageWorkingHours",
    label: "Avg Hours",
    hint: "Average working time",
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
          ? "flex h-full min-h-[28rem] flex-col gap-3"
          : "grid grid-cols-2 gap-3 lg:grid-cols-4",
        className,
      )}
    >
      {CARDS.map((card) => {
        const raw = summary[card.key];
        const display = card.format
          ? card.format(raw)
          : String(raw ?? 0);

        return (
          <div
            key={card.key}
            className={cn(
              "rounded-2xl border bg-card px-5 py-4 shadow-sm",
              isSidebar && "flex flex-1 flex-col justify-center min-h-[5.25rem]",
            )}
          >
            <p className="text-xs font-medium text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
              {display}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
          </div>
        );
      })}
    </section>
  );
}
