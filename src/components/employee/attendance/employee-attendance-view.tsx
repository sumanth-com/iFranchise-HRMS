"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";
import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { EmployeeAttendanceWidget } from "@/components/employee/dashboard/employee-attendance-widget";
import { EmployeeStatCard } from "@/components/employee/dashboard/employee-module-primitives";
import { Label } from "@/components/ui/label";
import { formatAttendanceTime } from "@/lib/attendance/services/attendance-utils";
import { employeeRequestRegularizationAction } from "@/lib/employee/actions/employee-dashboard-actions";
import { formatHoursLabel } from "@/lib/employee/attendance-format";
import type { ManagerAttendanceHistoryRow, ManagerProfilePageData } from "@/types/manager-self-attendance";
import { CalendarCheck, CalendarX, Clock, Timer } from "lucide-react";

function RegularizeModal({
  row,
  open,
  onOpenChange,
  onDone,
}: {
  row: ManagerAttendanceHistoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (!row) return;
    if (reason.trim().length < 5) {
      toast.error("Please provide a reason (at least 5 characters).");
      return;
    }
    startTransition(async () => {
      const result = await employeeRequestRegularizationAction({
        attendanceId: row.id ?? undefined,
        attendanceDate: row.attendanceDate,
        requestedCheckInAt: checkIn || undefined,
        requestedCheckOutAt: checkOut || undefined,
        reason: reason.trim(),
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Regularization request submitted.");
      onOpenChange(false);
      setReason("");
      setCheckIn("");
      setCheckOut("");
      onDone();
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Regularize Attendance"
      description={row ? `Request a correction for ${row.attendanceDate}.` : undefined}
      footer={
        <Button disabled={isPending} onClick={submit}>
          Submit Request
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="reg-in">Check-In Time</Label>
            <Input id="reg-in" type="time" value={checkIn} onChange={(e) => setCheckIn(e.currentTarget.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg-out">Check-Out Time</Label>
            <Input id="reg-out" type="time" value={checkOut} onChange={(e) => setCheckOut(e.currentTarget.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reg-reason">Reason</Label>
          <textarea
            id="reg-reason"
            rows={3}
            value={reason}
            placeholder="Explain why this correction is needed…"
            className="flex min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            onChange={(e) => setReason(e.currentTarget.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

export function EmployeeAttendanceView({ data }: { data: ManagerProfilePageData }) {
  const router = useRouter();
  const [target, setTarget] = useState<ManagerAttendanceHistoryRow | null>(null);
  const [open, setOpen] = useState(false);

  const openRegularize = (row: ManagerAttendanceHistoryRow) => {
    setTarget(row);
    setOpen(true);
  };

  const columns: DataTableColumn<ManagerAttendanceHistoryRow>[] = [
    {
      key: "attendanceDate",
      header: "Date",
      render: (row) => <span className="whitespace-nowrap text-sm">{row.attendanceDate}</span>,
    },
    {
      key: "attendanceStatus",
      header: "Status",
      render: (row) => <AttendanceStatusBadge status={row.attendanceStatus} />,
    },
    {
      key: "checkInAt",
      header: "Check-In",
      render: (row) => (row.checkInAt ? formatAttendanceTime(row.checkInAt) : "—"),
    },
    {
      key: "checkOutAt",
      header: "Check-Out",
      render: (row) => (row.checkOutAt ? formatAttendanceTime(row.checkOutAt) : "—"),
    },
    {
      key: "workHours",
      header: "Hours",
      render: (row) => formatHoursLabel(row.workHours),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) =>
        row.canRequestRegularization ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            disabled={row.correctionStatus === "pending"}
            onClick={() => openRegularize(row)}
          >
            {row.correctionStatus === "pending" ? "Requested" : "Regularize"}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Attendance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Mark attendance, track working hours, and request corrections.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <EmployeeAttendanceWidget today={data.today} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-2">
            <EmployeeStatCard label="Present" value={String(data.summary.present)} icon={CalendarCheck} accent="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-500/10" />
            <EmployeeStatCard label="Absent" value={String(data.summary.absent)} icon={CalendarX} accent="text-rose-600 dark:text-rose-400" iconBg="bg-rose-500/10" />
            <EmployeeStatCard label="Late" value={String(data.summary.late)} icon={Clock} accent="text-amber-600 dark:text-amber-400" iconBg="bg-amber-500/10" />
            <EmployeeStatCard label="Half Days" value={String(data.summary.halfDay)} icon={Timer} accent="text-orange-600 dark:text-orange-400" iconBg="bg-orange-500/10" />
            <EmployeeStatCard label="On Leave" value={String(data.summary.leave)} icon={CalendarX} accent="text-indigo-600 dark:text-indigo-400" iconBg="bg-indigo-500/10" />
            <EmployeeStatCard label="Avg Hours" value={formatHoursLabel(data.summary.averageWorkingHours)} icon={Timer} accent="text-sky-600 dark:text-sky-400" iconBg="bg-sky-500/10" />
          </div>
        </div>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Attendance History</h2>
          <DataTable
            columns={columns}
            data={data.history.data}
            emptyMessage="No attendance records for this month."
          />
        </section>
      </div>

      <RegularizeModal
        row={target}
        open={open}
        onOpenChange={setOpen}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
