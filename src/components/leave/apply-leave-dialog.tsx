"use client";

import { useEffect, useMemo, useState } from "react";

import { Modal } from "@/components/common/modal";
import { LeaveForm } from "@/components/leave/leave-form";
import { getLeaveApplyContextAction } from "@/lib/leave/actions";
import type { LeaveApplyContext, LeaveEmployeeBalanceSnapshot, LeaveLookups } from "@/types/leave";

const applyContextCache = new Map<string, LeaveApplyContext>();
const applyContextInflight = new Map<string, Promise<LeaveApplyContext | null>>();

function prefetchLeaveApplyContext(employeeId: string) {
  const cached = applyContextCache.get(employeeId);
  if (cached) return Promise.resolve(cached);

  const pending = applyContextInflight.get(employeeId);
  if (pending) return pending;

  const request = getLeaveApplyContextAction(employeeId).then((result) => {
    applyContextInflight.delete(employeeId);
    if (!result.success) return null;
    applyContextCache.set(employeeId, result.data);
    return result.data;
  });
  applyContextInflight.set(employeeId, request);
  return request;
}

export function clearLeaveApplyContextCache(employeeId?: string) {
  if (employeeId) {
    applyContextCache.delete(employeeId);
    applyContextInflight.delete(employeeId);
    return;
  }
  applyContextCache.clear();
  applyContextInflight.clear();
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lookups: LeaveLookups;
  /** Self-service: fixed to one employee. Team: optional pre-selected employee. */
  employeeId?: string;
  mode?: "self" | "team";
  balances?: LeaveEmployeeBalanceSnapshot[];
  onSubmitted?: () => void;
};

export function ApplyLeaveDialog({
  open,
  onOpenChange,
  lookups,
  employeeId,
  mode = "self",
  balances = [],
  onSubmitted,
}: Props) {
  const isTeam = mode === "team";
  const [applyContext, setApplyContext] = useState<LeaveApplyContext | null>(
    () => (employeeId ? applyContextCache.get(employeeId) ?? null : null),
  );

  const scopedLookups = useMemo(() => {
    if (isTeam || !employeeId) return lookups;
    const self =
      lookups.employees.find((employee) => employee.id === employeeId) ?? {
        id: employeeId,
        label: "You",
      };
    return { ...lookups, employees: [self] };
  }, [isTeam, lookups, employeeId]);

  useEffect(() => {
    if (!employeeId) return;
    void prefetchLeaveApplyContext(employeeId).then((context) => {
      if (context) setApplyContext(context);
    });
  }, [employeeId]);

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
      contentClassName={isTeam ? "sm:max-w-2xl" : "sm:max-w-xl"}
      showCancel={false}
    >
      {open ? (
        <LeaveForm
          lookups={scopedLookups}
          defaultEmployeeId={isTeam ? employeeId : employeeId}
          variant={isTeam ? "default" : "self"}
          initialApplyContext={applyContext}
          initialBalances={balances}
          onSuccess={() => {
            clearLeaveApplyContextCache(employeeId);
            onOpenChange(false);
            onSubmitted?.();
          }}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </Modal>
  );
}
