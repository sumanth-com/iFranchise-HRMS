"use client";

import { useMemo } from "react";

import { Modal } from "@/components/common/modal";
import { LeaveForm } from "@/components/leave/leave-form";
import type { LeaveLookups } from "@/types/leave";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: LeaveLookups;
  employeeId: string;
  onSubmitted?: () => void;
};

export function ApplyLeaveDialog({
  open,
  onOpenChange,
  lookups,
  employeeId,
  onSubmitted,
}: Props) {
  const scopedLookups = useMemo(() => {
    const self =
      lookups.employees.find((employee) => employee.id === employeeId) ?? {
        id: employeeId,
        label: "You",
      };
    return { ...lookups, employees: [self] };
  }, [lookups, employeeId]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Apply for Leave"
      description="Submit a leave request for manager and HR approval."
      contentClassName="sm:max-w-lg"
      showCancel={false}
    >
      {open ? (
        <LeaveForm
          lookups={scopedLookups}
          defaultEmployeeId={employeeId}
          variant="self"
          onSuccess={() => {
            onOpenChange(false);
            onSubmitted?.();
          }}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Modal>
  );
}
