"use client";

import { useMemo } from "react";

import { Modal } from "@/components/common/modal";
import { LeaveForm } from "@/components/leave/leave-form";
import type { LeaveLookups } from "@/types/leave";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: LeaveLookups;
  /** Self-service: fixed to one employee. Team: optional pre-selected employee. */
  employeeId?: string;
  mode?: "self" | "team";
  onSubmitted?: () => void;
};

export function ApplyLeaveDialog({
  open,
  onOpenChange,
  lookups,
  employeeId,
  mode = "self",
  onSubmitted,
}: Props) {
  const isTeam = mode === "team";

  const scopedLookups = useMemo(() => {
    if (isTeam || !employeeId) return lookups;
    const self =
      lookups.employees.find((employee) => employee.id === employeeId) ?? {
        id: employeeId,
        label: "You",
      };
    return { ...lookups, employees: [self] };
  }, [isTeam, lookups, employeeId]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isTeam ? "Apply leave" : "Apply for Leave"}
      description={
        isTeam
          ? "Create a leave request for an employee. It will follow the normal approval workflow."
          : "Submit a leave request for manager and HR approval."
      }
      contentClassName={isTeam ? "sm:max-w-2xl" : "sm:max-w-lg"}
      showCancel={false}
    >
      {open ? (
        <LeaveForm
          lookups={scopedLookups}
          defaultEmployeeId={isTeam ? employeeId : employeeId}
          variant={isTeam ? "default" : "self"}
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
