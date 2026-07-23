"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import type { EmployeeListItem } from "@/types/employee";

const DELETE_RULES = [
  "Permanently removes the employee profile, login access, attendance, leave, payroll, documents, and related HR records.",
  "This action cannot be undone. The person will disappear from employee lists, reports, and manager views.",
  "Any active portal session for this employee is revoked immediately.",
  "HR can add the same person again later using Add Employee or Invite with the same email — a new employee record will be created.",
] as const;

type EmployeeDeleteConfirmDialogProps = {
  employee: EmployeeListItem | null;
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function EmployeeDeleteConfirmDialog({
  employee,
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: EmployeeDeleteConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Permanently delete employee?"
      description={
        employee
          ? `You are about to permanently remove ${employee.fullName} (${employee.employeeCode}).`
          : undefined
      }
      contentClassName="sm:max-w-xl"
      showCancel={false}
      footer={
        <>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={isPending || !employee} onClick={onConfirm}>
            {isPending ? "Deleting..." : "Delete permanently"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-foreground">Before you continue</p>
            <p className="text-muted-foreground">
              Use this only when the employee should be fully removed from the system. For
              temporary access changes, suspend the account instead.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">What happens when you delete</p>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {DELETE_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
