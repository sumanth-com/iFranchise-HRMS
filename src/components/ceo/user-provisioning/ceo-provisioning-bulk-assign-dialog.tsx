"use client";

import { Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { bulkUpdateProvisioningReportingContactsAction } from "@/lib/ceo/actions/ceo-user-provisioning-actions";
import { canChangeProvisioningReportingContacts } from "@/lib/ceo/provisioning-user-permissions";
import { cn } from "@/lib/utils";
import type {
  CeoProvisioningLookups,
  CeoProvisioningUser,
} from "@/types/ceo-user-provisioning";

type BulkAssignDialogProps = {
  open: boolean;
  users: CeoProvisioningUser[];
  lookups: CeoProvisioningLookups;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
};

export function CeoProvisioningBulkAssignDialog({
  open,
  users,
  lookups,
  onOpenChange,
  onSaved,
}: BulkAssignDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [managerId, setManagerId] = useState<string>("__unchanged__");
  const [hrId, setHrId] = useState<string>("__unchanged__");

  const assignableUsers = useMemo(
    () => users.filter((user) => canChangeProvisioningReportingContacts(user)),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return assignableUsers;
    return assignableUsers.filter((user) =>
      [user.fullName, user.email, user.employeeCode, user.departmentName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [assignableUsers, search]);

  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setSearch("");
    setSelectedIds(new Set());
    setManagerId("__unchanged__");
    setHrId("__unchanged__");
  }, [open]);

  const managerItems = useMemo(
    () => [
      { value: "__unchanged__", label: "Keep existing manager" },
      { value: "__none__", label: "No manager" },
      ...lookups.managers.map((item) => ({ value: item.id, label: item.label })),
    ],
    [lookups.managers],
  );

  const hrItems = useMemo(
    () => [
      { value: "__unchanged__", label: "Keep existing HR contact" },
      ...((lookups.hrApprovers ?? []).map((item) => ({
        value: item.id,
        label: item.label,
      })) ?? []),
    ],
    [lookups.hrApprovers],
  );

  function toggleEmployee(employeeId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  }

  function toggleAllFiltered() {
    const filteredIds = filteredUsers.map((user) => user.employeeId);
    const allSelected = filteredIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of filteredIds) next.delete(id);
      } else {
        for (const id of filteredIds) next.add(id);
      }
      return next;
    });
  }

  function handleSave() {
    setSubmitError(null);
    const updateManager = managerId !== "__unchanged__";
    const updateHr = hrId !== "__unchanged__";

    if (selectedIds.size === 0) {
      setSubmitError("Select at least one employee.");
      return;
    }
    if (!updateManager && !updateHr) {
      setSubmitError("Select a manager and/or HR contact to update.");
      return;
    }

    startTransition(async () => {
      const result = await bulkUpdateProvisioningReportingContactsAction({
        employeeIds: [...selectedIds],
        updateManager,
        updateHr,
        reportingManagerId: updateManager
          ? managerId === "__none__"
            ? null
            : managerId
          : undefined,
        assignedHrEmployeeId: updateHr ? hrId : undefined,
      });

      if (!result.success) {
        setSubmitError(result.message);
        return;
      }

      onOpenChange(false);
      onSaved(result.message);
    });
  }

  const selectedCount = selectedIds.size;
  const allFilteredSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((user) => selectedIds.has(user.employeeId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,44rem)] w-full flex-col gap-0 overflow-visible sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1.5 pr-8">
          <DialogTitle>Bulk assign manager & HR</DialogTitle>
          <DialogDescription>
            Select employees, then apply a manager and/or HR contact. Unchanged
            fields keep their current values.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 pt-4">
          {submitError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              {submitError}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-manager">Manager</Label>
              <LabeledSelect
                id="bulk-manager"
                value={managerId}
                placeholder="Keep existing manager"
                items={managerItems}
                triggerClassName="h-10 w-full min-w-0 bg-white dark:bg-input"
                contentClassName="z-[1200] max-h-64 min-w-[var(--anchor-width)] w-[var(--anchor-width)]"
                onValueChange={setManagerId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-hr">HR contact</Label>
              <LabeledSelect
                id="bulk-hr"
                value={hrId}
                placeholder="Keep existing HR contact"
                items={hrItems}
                triggerClassName="h-10 w-full min-w-0 bg-white dark:bg-input"
                contentClassName="z-[1200] max-h-64 min-w-[var(--anchor-width)] w-[var(--anchor-width)]"
                onValueChange={setHrId}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {selectedCount} employee{selectedCount === 1 ? "" : "s"} selected
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleAllFiltered}
              disabled={filteredUsers.length === 0}
            >
              {allFilteredSelected ? "Clear visible" : "Select visible"}
            </Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search employees…"
              className="h-10 pl-9"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/80 bg-muted/20">
            {filteredUsers.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No assignable employees match your search.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {filteredUsers.map((user) => {
                  const checked = selectedIds.has(user.employeeId);
                  return (
                    <li key={user.employeeId}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 px-3 py-2.5 transition-colors hover:bg-background/80",
                          checked && "bg-violet-500/5",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4 rounded border-border text-violet-600 focus-visible:ring-violet-500/40"
                          checked={checked}
                          onChange={() => toggleEmployee(user.employeeId)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-foreground">
                            {user.fullName}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {user.employeeCode}
                            {user.departmentName ? ` · ${user.departmentName}` : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-border/70 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isPending} onClick={handleSave}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
