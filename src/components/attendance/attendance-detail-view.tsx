"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { buttonVariants } from "@/components/common/button";
import { ATTENDANCE_ROUTES } from "@/lib/attendance/constants";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import type { AttendanceDetail } from "@/types/attendance";
import { cn } from "@/lib/utils";

type AttendanceDetailViewProps = {
  attendance: AttendanceDetail;
  canEdit: boolean;
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-3 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function formatDateTime(value?: string | null) {
  return formatAttendanceTime(value);
}

function formatAuditActor(
  actor: AttendanceDetail["createdBy"],
  timestamp: string,
) {
  const name = actor?.employeeName ?? actor?.userId ?? "System";
  return `${name} · ${format(parseISO(timestamp), "dd MMM yyyy, hh:mm a")}`;
}

export function AttendanceDetailView({
  attendance,
  canEdit,
}: AttendanceDetailViewProps) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {attendance.employeeName}
              </h1>
              <AttendanceStatusBadge status={attendance.attendanceStatus} />
            </div>
            <p className="text-sm text-muted-foreground">
              {attendance.employeeCode} ·{" "}
              {format(parseISO(attendance.attendanceDate), "dd MMM yyyy")}
            </p>
          </div>
          {canEdit ? (
            <Link
              href={ATTENDANCE_ROUTES.edit(attendance.id)}
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
            >
              <Pencil className="size-4" />
              Edit attendance
            </Link>
          ) : null}
        </div>

        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
          <section className="rounded-xl border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Employee Information
            </h2>
            <DetailRow label="Employee Code" value={attendance.employeeCode} />
            <DetailRow label="Employee Name" value={attendance.employeeName} />
            <DetailRow label="Email" value={attendance.employeeEmail ?? "—"} />
            <DetailRow
              label="Department"
              value={attendance.departmentName ?? "—"}
            />
            <DetailRow
              label="Designation"
              value={attendance.designationTitle ?? "—"}
            />
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Attendance Information
            </h2>
            <DetailRow
              label="Attendance Date"
              value={format(parseISO(attendance.attendanceDate), "dd MMM yyyy")}
            />
            <DetailRow label="Check In" value={formatDateTime(attendance.checkInAt)} />
            <DetailRow label="Check Out" value={formatDateTime(attendance.checkOutAt)} />
            <DetailRow
              label="Status"
              value={
                <AttendanceStatusBadge status={attendance.attendanceStatus} />
              }
            />
            <DetailRow
              label="Working Hours"
              value={`${attendance.workHours.toFixed(2)} hours`}
            />
            <DetailRow
              label="Late Minutes"
              value={
                attendance.lateMinutes > 0
                  ? `${attendance.lateMinutes} min`
                  : "—"
              }
            />
            <DetailRow
              label="Overtime"
              value={`${attendance.overtimeHours.toFixed(2)} hours`}
            />
            <DetailRow label="Remarks" value={attendance.notes ?? "—"} />
          </section>
        </div>

        <div className="border-t px-5 py-5 sm:px-6">
          <section className="rounded-xl border p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Audit Information
            </h2>
            <DetailRow
              label="Created"
              value={formatAuditActor(attendance.createdBy, attendance.createdAt)}
            />
            <DetailRow
              label="Last Updated"
              value={formatAuditActor(attendance.updatedBy, attendance.updatedAt)}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
