import {
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAttendanceKpis } from "@/types/ceo-attendance";
import { cn } from "@/lib/utils";

export function CeoAttendanceSummary({ kpis }: { kpis: CeoAttendanceKpis }) {
  return (
    <section
      aria-label="Attendance KPIs"
      className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
    >
      <CeoStatCard
        label="Attendance %"
        value={formatCeoPercent(kpis.overallAttendancePercent)}
      />
      <CeoStatCard
        label="Present Today"
        value={String(kpis.presentToday)}
        accent="text-emerald-600 dark:text-emerald-400"
      />
      <CeoStatCard
        label="Absent Today"
        value={String(kpis.absentToday)}
        accent={kpis.absentToday > 0 ? "text-destructive" : undefined}
      />
      <CeoStatCard label="On Leave" value={String(kpis.onLeaveToday)} />
      <CeoStatCard
        label="Late Today"
        value={String(kpis.lateArrivals)}
        accent={kpis.lateArrivals > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
      />
      <CeoStatCard
        label="Compliance"
        value={formatCeoPercent(kpis.attendanceCompliancePercent)}
        accent={cn(
          kpis.attendanceCompliancePercent < 80
            ? "text-amber-700 dark:text-amber-400"
            : "text-emerald-600 dark:text-emerald-400",
        )}
      />
    </section>
  );
}
