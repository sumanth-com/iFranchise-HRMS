import { useOptionalSelfAttendanceLive } from "@/components/attendance/self-attendance-live-context";
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
    key: "leave",
    label: "On Leave",
    hint: "Leave days this month",
    sidebarHint: "Leave days",
  },
];

export function ManagerProfileSummaryCards({
  summary,
  className,
  layout = "grid",
}: Props) {
  const isSidebar = layout === "sidebar";
  const live = useOptionalSelfAttendanceLive();

  return (
    <section
      className={cn(
        isSidebar
          ? "flex h-full min-h-0 w-full flex-col gap-2 max-xl:grid max-xl:h-auto max-xl:min-h-0 max-xl:grid-cols-2"
          : "grid grid-cols-2 gap-3 xl:grid-cols-4",
        className,
      )}
    >
      {CARDS.map((card) => {
        const raw =
          card.key === "leave" && live
            ? live.calendarDays.filter(
                (day) => day.inMonth && day.status === "on_leave",
              ).length
            : summary[card.key];
        const display = String(raw ?? 0);

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
                card.key === "late" && Number(raw) > 0 && "text-orange-600 dark:text-orange-400",
                card.key === "leave" && Number(raw) > 0 && "text-violet-600 dark:text-violet-400",
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
