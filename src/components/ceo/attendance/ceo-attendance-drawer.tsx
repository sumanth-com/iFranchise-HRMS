"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { formatCeoPercent } from "@/components/ceo/ceo-module-primitives";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { fetchCeoAttendanceEmployeeDetailAction } from "@/lib/ceo/actions/ceo-attendance-actions";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import type { CeoAttendanceEmployeeDetail } from "@/types/ceo-attendance";

type CeoAttendanceDrawerProps = {
  employeeId: string | null;
  month?: number;
  year?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

export function CeoAttendanceDrawer({
  employeeId,
  month,
  year,
  open,
  onOpenChange,
}: CeoAttendanceDrawerProps) {
  const [detail, setDetail] = useState<CeoAttendanceEmployeeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !employeeId) {
      setDetail(null);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await fetchCeoAttendanceEmployeeDetailAction({
        employeeId,
        month,
        year,
      });
      if (!result.success) {
        setDetail(null);
        setError(result.message);
        return;
      }
      setError(null);
      setDetail(result.data);
    });
  }, [open, employeeId, month, year]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Employee Attendance</SheetTitle>
        </SheetHeader>

        {isPending ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading attendance…
          </div>
        ) : error ? (
          <p className="py-10 text-center text-sm text-destructive">{error}</p>
        ) : detail ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
              <EmployeeAvatar
                firstName={detail.firstName}
                lastName={detail.lastName}
                profileImagePath={detail.profileImagePath}
                className="size-14"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{detail.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {detail.employeeCode}
                  {detail.designationTitle ? ` · ${detail.designationTitle}` : ""}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Department" value={detail.departmentName} />
              <Field label="Designation" value={detail.designationTitle} />
              <Field label="Manager" value={detail.managerName} />
              <Field label="Email" value={detail.email} />
            </div>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Attendance Summary</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Present</p>
                  <p className="font-semibold tabular-nums">
                    {detail.attendanceSummary.presentDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Absent</p>
                  <p className="font-semibold tabular-nums">
                    {detail.attendanceSummary.absentDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Late</p>
                  <p className="font-semibold tabular-nums">
                    {detail.attendanceSummary.lateDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Leave</p>
                  <p className="font-semibold tabular-nums">
                    {detail.attendanceSummary.leaveDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">WFH</p>
                  <p className="font-semibold tabular-nums">
                    {detail.attendanceSummary.wfhDays}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Hours</p>
                  <p className="font-semibold tabular-nums">
                    {detail.attendanceSummary.averageHours.toFixed(1)}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid gap-2 sm:grid-cols-2">
              <Field
                label="Monthly Attendance"
                value={formatCeoPercent(detail.monthlyAttendancePercent)}
              />
              <Field
                label="Yearly Attendance"
                value={formatCeoPercent(detail.yearlyAttendancePercent)}
              />
              <Field
                label="Overtime"
                value={`${detail.overtimeHours.toFixed(1)} hrs`}
              />
              <Field
                label="Leave Summary"
                value={`${detail.leaveSummary.leave} leave · ${detail.leaveSummary.absent} absent`}
              />
            </div>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Late Records</h3>
              {detail.lateRecords.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No late records.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {detail.lateRecords.map((item) => (
                    <li key={item.date} className="flex justify-between gap-2">
                      <span>{format(new Date(item.date), "d MMM yyyy")}</span>
                      <span className="tabular-nums text-amber-600 dark:text-amber-400">
                        {item.lateMinutes} min · {formatAttendanceTime(item.checkInAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Attendance Trend</h3>
              <ul className="mt-2 space-y-1.5 text-sm">
                {detail.attendanceTrend.map((item) => (
                  <li key={item.label} className="flex justify-between gap-2">
                    <span>{item.label}</span>
                    <span className="tabular-nums">{item.value}%</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border p-4">
              <h3 className="text-sm font-semibold">Recent Attendance</h3>
              {detail.recentAttendance.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No recent records.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {detail.recentAttendance.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {format(new Date(item.date), "d MMM yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatAttendanceTime(item.checkInAt)} –{" "}
                          {formatAttendanceTime(item.checkOutAt)}
                          {item.workHours > 0
                            ? ` · ${item.workHours.toFixed(1)} hrs`
                            : ""}
                        </p>
                      </div>
                      <AttendanceStatusBadge status={item.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <p className="text-xs text-muted-foreground">
              CEO access is view-only. Attendance cannot be edited, approved, or punched
              from this portal.
            </p>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
