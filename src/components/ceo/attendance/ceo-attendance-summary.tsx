import {
  CeoStatCard,
  formatCeoPercent,
} from "@/components/ceo/ceo-module-primitives";
import type { CeoAttendanceKpis } from "@/types/ceo-attendance";

export function CeoAttendanceSummary({ kpis }: { kpis: CeoAttendanceKpis }) {
  return (
    <section
      aria-label="Attendance KPIs"
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"
    >
      <CeoStatCard
        label="Overall Attendance %"
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
      <CeoStatCard label="On Leave Today" value={String(kpis.onLeaveToday)} />
      <CeoStatCard label="Work From Home" value={String(kpis.workFromHome)} />
      <CeoStatCard
        label="Late Arrivals"
        value={String(kpis.lateArrivals)}
        accent={kpis.lateArrivals > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
      />
      <CeoStatCard label="Early Checkouts" value={String(kpis.earlyCheckouts)} />
      <CeoStatCard
        label="Average Working Hours"
        value={`${kpis.averageWorkingHours.toFixed(1)} hrs`}
      />
      <CeoStatCard
        label="Attendance Compliance %"
        value={formatCeoPercent(kpis.attendanceCompliancePercent)}
      />
      <CeoStatCard
        label="Overtime Hours"
        value={`${kpis.overtimeHours.toFixed(1)} hrs`}
      />
    </section>
  );
}
