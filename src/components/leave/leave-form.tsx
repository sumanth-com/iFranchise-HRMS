"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { createLeaveRequestAction, getEmployeeLeaveBalanceSnapshotAction } from "@/lib/leave/actions";
import {
  HALF_DAY_PERIOD_LABELS,
  LEAVE_ROUTES,
} from "@/lib/leave/constants";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import {
  leaveFormSchema,
  type LeaveFormInput,
} from "@/lib/validations/leave";
import type { LeaveEmployeeBalanceSnapshot, LeaveLookups } from "@/types/leave";

type LeaveFormProps = {
  lookups: LeaveLookups;
  defaultEmployeeId?: string;
  mode?: "create";
  /** When set, the form redirects here on success/cancel instead of the HR leave routes. */
  redirectPath?: string;
};

export function LeaveForm({ lookups, defaultEmployeeId, redirectPath }: LeaveFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [balances, setBalances] = useState<LeaveEmployeeBalanceSnapshot[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  const employeeItems = lookups.employees.map((employee) => ({
    value: employee.id,
    label: employee.code
      ? `${employee.label} (${employee.code})`
      : employee.label,
  }));

  const leaveTypeItems = lookups.leaveTypes.map((leaveType) => ({
    value: leaveType.id,
    label: leaveType.label,
  }));

  const halfDayPeriodItems = Object.entries(HALF_DAY_PERIOD_LABELS).map(
    ([value, label]) => ({ value, label }),
  );

  const today = getTodayDateString();

  const form = useForm<LeaveFormInput>({
    resolver: zodResolver(leaveFormSchema) as Resolver<LeaveFormInput>,
    defaultValues: {
      employeeId: defaultEmployeeId ?? "",
      leaveTypeId: "",
      startDate: today,
      endDate: today,
      isHalfDay: false,
      halfDayPeriod: "",
      reason: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      attachmentPath: "",
    },
  });

  const isHalfDay = form.watch("isHalfDay");
  const selectedEmployeeId = form.watch("employeeId");

  useEffect(() => {
    if (!selectedEmployeeId) {
      setBalances([]);
      return;
    }

    let cancelled = false;
    setBalancesLoading(true);

    void getEmployeeLeaveBalanceSnapshotAction(selectedEmployeeId).then((result) => {
      if (cancelled) return;
      setBalancesLoading(false);
      if (result.success) {
        setBalances(result.data);
        return;
      }
      setBalances([]);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedEmployeeId]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createLeaveRequestAction(values);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Leave request submitted successfully");

      if (redirectPath) {
        router.push(redirectPath);
        router.refresh();
        return;
      }

      if (result.data) {
        router.push(LEAVE_ROUTES.detail(result.data));
        router.refresh();
        return;
      }

      router.push(LEAVE_ROUTES.list);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employeeId">Employee</Label>
          <Select
            items={employeeItems}
            value={form.watch("employeeId")}
            onValueChange={(value) => {
              if (!value) return;
              form.setValue("employeeId", value, { shouldValidate: true });
            }}
            disabled={isPending}
          >
            <SelectTrigger id="employeeId" className="h-8 w-full min-w-0">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {employeeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.employeeId ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.employeeId.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="leaveTypeId">Leave Type</Label>
          <Select
            items={leaveTypeItems}
            value={form.watch("leaveTypeId")}
            onValueChange={(value) => {
              if (!value) return;
              form.setValue("leaveTypeId", value, { shouldValidate: true });
            }}
            disabled={isPending}
          >
            <SelectTrigger id="leaveTypeId" className="h-8 w-full min-w-0">
              <SelectValue placeholder="Select leave type" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {leaveTypeItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.leaveTypeId ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.leaveTypeId.message}
            </p>
          ) : null}
        </div>

        {selectedEmployeeId ? (
          <div className="md:col-span-2">
            <section className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium">Current leave balances</h2>
                  <p className="text-xs text-muted-foreground">
                    CL, EL, Optional Holiday, and LOP available before submission.
                  </p>
                </div>
                {balancesLoading ? (
                  <span className="text-xs text-muted-foreground">Loading...</span>
                ) : null}
              </div>
              {balances.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {balances.map((balance) => (
                    <div
                      key={balance.leaveTypeCode}
                      className="rounded-lg border bg-card px-4 py-3"
                    >
                      <p className="text-xs text-muted-foreground">
                        {balance.leaveTypeName}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {balance.balanceDays}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Used {balance.usedDays} · Pending {balance.pendingDays}
                      </p>
                    </div>
                  ))}
                </div>
              ) : !balancesLoading ? (
                <p className="text-sm text-muted-foreground">
                  No CL, EL, Optional Holiday, or LOP balances configured for this employee.
                </p>
              ) : null}
            </section>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            disabled={isPending}
            {...form.register("startDate")}
          />
          {form.formState.errors.startDate ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.startDate.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            disabled={isPending || isHalfDay}
            {...form.register("endDate")}
          />
          {form.formState.errors.endDate ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.endDate.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border"
              disabled={isPending}
              checked={isHalfDay}
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                form.setValue("isHalfDay", checked, { shouldValidate: true });
                if (checked) {
                  const startDate = form.getValues("startDate");
                  form.setValue("endDate", startDate, { shouldValidate: true });
                } else {
                  form.setValue("halfDayPeriod", "", { shouldValidate: true });
                }
              }}
            />
            Half day leave
          </label>
        </div>

        {isHalfDay ? (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="halfDayPeriod">Half Day Period</Label>
            <Select
              items={halfDayPeriodItems}
              value={form.watch("halfDayPeriod") ?? ""}
              onValueChange={(value) => {
                if (!value) return;
                form.setValue(
                  "halfDayPeriod",
                  value as LeaveFormInput["halfDayPeriod"],
                  { shouldValidate: true },
                );
              }}
              disabled={isPending}
            >
              <SelectTrigger id="halfDayPeriod" className="h-8 w-full min-w-0">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {halfDayPeriodItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.halfDayPeriod ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.halfDayPeriod.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="reason">Reason</Label>
          <textarea
            id="reason"
            rows={4}
            disabled={isPending}
            className="flex min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            {...form.register("reason")}
          />
          {form.formState.errors.reason ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.reason.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergencyContactName">Emergency Contact Name</Label>
          <Input
            id="emergencyContactName"
            disabled={isPending}
            {...form.register("emergencyContactName")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
          <Input
            id="emergencyContactPhone"
            disabled={isPending}
            {...form.register("emergencyContactPhone")}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="attachmentPath">Attachment Path</Label>
          <Input
            id="attachmentPath"
            placeholder="Enter attachment file path"
            disabled={isPending}
            {...form.register("attachmentPath")}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => router.push(redirectPath ?? LEAVE_ROUTES.list)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          Submit leave request
        </Button>
      </div>
    </form>
  );
}
