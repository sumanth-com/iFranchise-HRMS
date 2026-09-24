"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { Label } from "@/components/ui/label";
import { setManualAttendanceStatusAction } from "@/lib/attendance/actions";
import {
  MANUAL_ATTENDANCE_STATUS_ITEMS,
  mapStoredAttendanceToManualUi,
  type ManualAttendanceUiStatus,
  type StoredManualAttendanceStatus,
} from "@/lib/attendance/manual-status";
import type { AttendanceListItem } from "@/types/attendance";

export type ManualAttendanceStatusSaveResult = {
  previousId: string;
  id: string;
  attendanceStatus: StoredManualAttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  workHours: number;
};

type ManualAttendanceStatusDialogProps = {
  /** One or more attendance rows to update with the same status. */
  records: AttendanceListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (results: ManualAttendanceStatusSaveResult[]) => void;
};

export function ManualAttendanceStatusDialog({
  records,
  open,
  onOpenChange,
  onSaved,
}: ManualAttendanceStatusDialogProps) {
  const [status, setStatus] = useState<ManualAttendanceUiStatus | "">("");
  const [isPending, startTransition] = useTransition();
  const isBulk = records.length > 1;
  const primary = records[0] ?? null;

  useEffect(() => {
    if (!open || !primary) {
      setStatus("");
      return;
    }
    if (isBulk) {
      setStatus("");
      return;
    }
    setStatus(mapStoredAttendanceToManualUi(primary.attendanceStatus, primary.notes));
  }, [open, primary, isBulk]);

  const canSave = Boolean(records.length > 0 && status) && !isPending;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (isPending) return;
        onOpenChange(next);
      }}
      title={isBulk ? "Update attendance status" : "Update attendance"}
      description={
        isBulk
          ? `Set the same attendance status for ${records.length} selected records.`
          : "Set attendance for the selected date. Desktop check-in records stay on file when you mark Present."
      }
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
              if (!status || records.length === 0) return;
              const nextStatus = status;
              startTransition(async () => {
                const results: ManualAttendanceStatusSaveResult[] = [];
                let failed = 0;
                let firstError: string | null = null;

                for (const record of records) {
                  const result = await setManualAttendanceStatusAction({
                    employeeId: record.employeeId,
                    attendanceDate: record.attendanceDate,
                    attendanceStatus: nextStatus,
                  });
                  if (!result.success) {
                    failed += 1;
                    if (!firstError) firstError = result.message;
                    continue;
                  }
                  results.push({
                    previousId: record.id,
                    id: result.data.id,
                    attendanceStatus: result.data.attendanceStatus,
                    checkInAt: result.data.checkInAt,
                    checkOutAt: result.data.checkOutAt,
                    workHours: result.data.workHours,
                  });
                }

                if (results.length === 0) {
                  toast.error(firstError ?? "Failed to update attendance");
                  return;
                }

                onSaved(results);
                onOpenChange(false);

                if (failed > 0) {
                  toast.warning(
                    `Updated ${results.length} of ${records.length}. ${failed} failed.`,
                  );
                } else {
                  toast.success(
                    isBulk
                      ? `Updated status for ${results.length} records`
                      : "Attendance updated",
                  );
                }
              });
            }}
          >
            {isPending ? "Saving…" : isBulk ? `Update ${records.length}` : "Save"}
          </Button>
        </>
      }
    >
      {primary ? (
        <div className="space-y-4">
          {isBulk ? (
            <p className="text-sm text-muted-foreground">
              {records.length} employees selected for{" "}
              <span className="font-medium text-foreground">
                {primary.attendanceDate}
                {records.every((r) => r.attendanceDate === primary.attendanceDate)
                  ? ""
                  : " (and other dates)"}
              </span>
              .
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Employee Name</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {primary.employeeName}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Employee ID</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {primary.employeeCode}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="manual-attendance-status">Attendance Status</Label>
            <LabeledSelect
              id="manual-attendance-status"
              items={[...MANUAL_ATTENDANCE_STATUS_ITEMS]}
              value={status}
              onValueChange={(value) => setStatus(value as ManualAttendanceUiStatus)}
              placeholder="Select status"
              triggerClassName="h-10 w-full min-w-0 bg-white dark:bg-input"
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
