import { CalendarCheck, Clock3, Plane, Star, UserRoundX } from "lucide-react";

import { siteConfig } from "@/config/site";
import type { EmployeeAttendanceCardSnapshot } from "@/types/employee-attendance-card";

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof CalendarCheck;
  tone: string;
}) {
  return (
    <div className="rounded-xl border bg-white/80 px-3 py-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className="truncate text-lg font-semibold tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

export function EmployeeAttendanceScanCard({
  snapshot,
}: {
  snapshot: EmployeeAttendanceCardSnapshot;
}) {
  const leaveLabel = snapshot.hasTakenLeave
    ? `${snapshot.leaveDays} day${snapshot.leaveDays === 1 ? "" : "s"}`
    : "None";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f7f4ff] via-white to-[#ebe4ff] px-4 py-10">
      <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-[0_20px_50px_-20px_rgba(79,70,229,0.35)]">
        <div className="bg-gradient-to-br from-[#7b5cff] to-[#4b3f8f] px-6 pb-10 pt-8 text-white">
          <p className="text-[0.7rem] font-medium tracking-[0.16em] text-white/75 uppercase">
            {siteConfig.name}
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">
            {snapshot.fullName}
          </h1>
          <p className="mt-1 text-sm text-white/85">
            {[snapshot.designation, snapshot.departmentName].filter(Boolean).join(" · ") ||
              "Team member"}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-white/15 px-3 py-1 font-mono text-xs font-semibold tracking-wide">
            ID · {snapshot.employeeCode}
          </p>
        </div>

        <div className="relative -mt-5 space-y-4 px-5 pb-6">
          <div className="rounded-2xl border bg-card px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {snapshot.monthLabel} attendance
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Monthly snapshot from this employee&apos;s digital ID card.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Present"
              value={snapshot.present}
              icon={CalendarCheck}
              tone="bg-emerald-500/15 text-emerald-700"
            />
            <Stat
              label="Late joins"
              value={snapshot.late}
              icon={Clock3}
              tone="bg-orange-500/15 text-orange-700"
            />
            <Stat
              label="Absents"
              value={snapshot.absent}
              icon={UserRoundX}
              tone="bg-rose-500/15 text-rose-700"
            />
            <Stat
              label="Leaves"
              value={leaveLabel}
              icon={Plane}
              tone="bg-violet-500/15 text-violet-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-muted/30 px-3 py-3">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Half days
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums">{snapshot.halfDay}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 px-3 py-3">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Avg hours
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums">
                {snapshot.averageWorkingHours > 0
                  ? `${snapshot.averageWorkingHours}h`
                  : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border bg-gradient-to-r from-amber-500/10 to-orange-500/5 px-4 py-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
              <Star className="size-5 fill-amber-500 text-amber-500" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Performance
              </p>
              <p className="text-base font-semibold">
                {snapshot.performanceRating != null
                  ? `${snapshot.performanceRating} / 5`
                  : "No review yet"}
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            {snapshot.hasTakenLeave
              ? `${snapshot.firstName} has taken leave this month.`
              : `${snapshot.firstName} has not taken leave this month.`}
          </p>
        </div>
      </div>
    </main>
  );
}
