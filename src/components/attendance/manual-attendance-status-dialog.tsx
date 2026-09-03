"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { Label } from "@/components/ui/label";
import { setManualAttendanceStatusAction } from "@/lib/attendance/actions";
import type { AttendanceDisplayStatus, AttendanceListItem } from "@/types/attendance";

const STATUS_ITEMS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "on_leave", label: "On Leave" },
] as const;

type ManualStatus = (typeof STATUS_ITEMS)[number]["value"];

function toManualStatus(status: AttendanceDisplayStatus): ManualStatus | "" {
  if (status === "absent") return "absent";
  if (status === "on_leave") return "on_leave";
  if (status === "present" || status === "late" || status === "half_day") {
    return "present";
  }
  return "";
}

type ManualAttendanceStatusDialogProps = {
  record: AttendanceListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (next: {
    previousId: string;
    id: string;
    attendanceStatus: ManualStatus;
    checkInAt: string | null;
    checkOutAt: string | null;
    workHours: number;
  }) => void;
};

export function ManualAttendanceStatusDialog({
  record,
  open,
  onOpenChange,
  onSaved,
}: ManualAttendanceStatusDialogProps) {
  const [status, setStatus] = useState<ManualStatus | "">("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !record) {
      setStatus("");
      return;
    }
    setStatus(toManualStatus(record.attendanceStatus));
  }, [open, record]);

  const canSave = Boolean(record && status) && !isPending;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
      title="Update attendance"
      description="Set attendance for the selected date. Desktop check-in records stay on file when you mark Present."
      contentClassName="sm:max-w-md"
      showCancel={false}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => {
              if (!record || !status) return;
              startTransition(async () => {
                const result = await setManualAttendanceStatusAction({
                  employeeId: record.employeeId,
                  attendanceDate: record.attendanceDate,
                  attendanceStatus: status,
                });
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                onSaved({
                  previousId: record.id,
                  id: result.data.id,
                  attendanceStatus: result.data.attendanceStatus,
                  checkInAt: result.data.checkInAt,
                  checkOutAt: result.data.checkOutAt,
                  workHours: result.data.workHours,
                });
                onOpenChange(false);
                toast.success("Attendance updated");
              });
            }}
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      {record ? (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Employee Name</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{record.employeeName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Employee ID</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{record.employeeCode}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-attendance-status">Attendance Status</Label>
            <LabeledSelect
              id="manual-attendance-status"
              items={[...STATUS_ITEMS]}
              value={status}
              onValueChange={(value) => setStatus(value as ManualStatus)}
              placeholder="Select status"
              triggerClassName="h-10 w-full min-w-0 bg-white dark:bg-input"
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
