"use client";

import { AttendanceForm } from "@/components/attendance/attendance-form";
import { Modal } from "@/components/common/modal";
import type { AttendanceLookups } from "@/types/attendance";

type AddAttendanceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: AttendanceLookups;
};

export function AddAttendanceDialog({
  open,
  onOpenChange,
  lookups,
}: AddAttendanceDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add attendance"
      description="Create a manual attendance record for an employee."
      contentClassName="sm:max-w-2xl"
      showCancel={false}
    >
      <AttendanceForm
        mode="create"
        lookups={lookups}
        onCancel={() => onOpenChange(false)}
        onSuccess={() => onOpenChange(false)}
      />
    </Modal>
  );
}
