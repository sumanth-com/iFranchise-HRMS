"use client";

import { format, parseISO } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { employeeRequestRegularizationAction } from "@/lib/employee/actions/employee-dashboard-actions";
import { extractTimeFromTimestamp } from "@/lib/attendance/services/attendance-utils";
import type { ManagerAttendanceHistoryRow } from "@/types/manager-self-attendance";

type Props = {
  row: ManagerAttendanceHistoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EmployeeRegularizationDialog({ row, open, onOpenChange }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checkIn, setCheckIn] = useState("10:00");
  const [checkOut, setCheckOut] = useState("19:00");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open || !row) return;
    setCheckIn(extractTimeFromTimestamp(row.checkInAt) || "10:00");
    setCheckOut(extractTimeFromTimestamp(row.checkOutAt) || "19:00");
    setReason("");
  }, [open, row]);

  function submit() {
    if (!row) return;

    startTransition(async () => {
      const result = await employeeRequestRegularizationAction({
        attendanceId: row.id ?? undefined,
        attendanceDate: row.attendanceDate,
        requestedCheckInAt: checkIn || undefined,
        requestedCheckOutAt: checkOut || undefined,
        reason,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Regularization request submitted");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Request Regularization"
      description={
        row
          ? `Submit a correction request for ${format(parseISO(row.attendanceDate), "dd MMM yyyy")}.`
          : undefined
      }
      footer={
        <Button disabled={isPending || reason.trim().length < 5} onClick={submit}>
          Submit request
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Requested check in</span>
            <Input
              type="time"
              value={checkIn}
              onChange={(event) => setCheckIn(event.target.value)}
            />
          </label>
          <label className="space-y-1.5 text-sm">
            <span className="font-medium">Requested check out</span>
            <Input
              type="time"
              value={checkOut}
              onChange={(event) => setCheckOut(event.target.value)}
            />
          </label>
        </div>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">Reason</span>
          <textarea
            className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this attendance needs correction"
          />
        </label>
      </div>
    </Modal>
  );
}
