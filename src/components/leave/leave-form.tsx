"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { PhoneInput } from "@/components/common/phone-input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { createLeaveRequestAction, getLeaveApplyContextAction, updateLeaveRequestAction } from "@/lib/leave/actions";
import {
  LEAVE_APPLY_TYPE_CODES,
  HALF_DAY_PERIOD_LABELS,
  LEAVE_ROUTES,
  sortByLeaveTypeCode,
} from "@/lib/leave/constants";
import { LeaveDurationPreview, LeavePolicyInfo } from "@/components/leave/leave-apply-policy-panel";
import { formatLeaveDayCount } from "@/lib/leave/services/leave-usage";
import { previewLeaveApplication } from "@/lib/leave/services/leave-apply-preview";
import {
  CASUAL_LEAVE_CODE,
  earliestAllowedLeaveStart,
} from "@/lib/leave/services/leave-policy-engine";
import { getTodayDateString } from "@/lib/attendance/services/attendance-utils";
import {
  leaveFormSchema,
  type LeaveFormInput,
} from "@/lib/validations/leave";
import type { LeaveApplyContext, LeaveListItem, LeaveLookups } from "@/types/leave";

type LeaveFormProps = {
  lookups: LeaveLookups;
  defaultEmployeeId?: string;
  mode?: "create" | "edit";
  /** Existing request when editing. */
  initialRequest?: Pick<
    LeaveListItem,
    | "id"
    | "employeeId"
    | "leaveTypeId"
    | "startDate"
    | "endDate"
    | "isHalfDay"
    | "halfDayPeriod"
    | "reason"
  > | null;
  /** When set, the form redirects here on success/cancel instead of the HR leave routes. */
  redirectPath?: string;
  /** Self-service modal: hide employee picker and optional fields. */
  variant?: "default" | "self";
  initialApplyContext?: LeaveApplyContext | null;
  initialBalances?: import("@/types/leave").LeaveEmployeeBalanceSnapshot[];
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function LeaveForm({
  lookups,
  defaultEmployeeId,
  mode = "create",
  initialRequest = null,
  redirectPath,
  variant = "default",
  initialApplyContext = null,
  initialBalances = [],
  onSuccess,
  onCancel,
}: LeaveFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [applyContext, setApplyContext] = useState<LeaveApplyContext | null>(initialApplyContext);
  const [balancesLoading, setBalancesLoading] = useState(!initialApplyContext && initialBalances.length === 0);

  const employeeItems = lookups.employees.map((employee) => ({
    value: employee.id,
    label: employee.code
      ? `${employee.label} (${employee.code})`
      : employee.label,
  }));

  const isEdit = mode === "edit" && Boolean(initialRequest?.id);

  const leaveTypeItems = sortByLeaveTypeCode(
    lookups.leaveTypes.filter((leaveType) => Boolean(leaveType.id)),
  )
    .filter((leaveType) => {
      if (!leaveType.code) return true;
      const code = leaveType.code.toUpperCase();
      if (isEdit && initialRequest?.leaveTypeId === leaveType.id) return true;
      return (LEAVE_APPLY_TYPE_CODES as readonly string[]).includes(code);
    })
    .map((leaveType) => ({
      value: leaveType.id,
      label: leaveType.code ? `${leaveType.label} (${leaveType.code})` : leaveType.label,
    }));

  const halfDayPeriodItems = Object.entries(HALF_DAY_PERIOD_LABELS).map(
    ([value, label]) => ({ value, label }),
  );

  const today = getTodayDateString();
  const defaultStart = earliestAllowedLeaveStart(CASUAL_LEAVE_CODE);

  const form = useForm<LeaveFormInput>({
    resolver: zodResolver(leaveFormSchema) as Resolver<LeaveFormInput>,
    defaultValues: {
      employeeId: initialRequest?.employeeId ?? defaultEmployeeId ?? "",
      leaveTypeId: initialRequest?.leaveTypeId ?? "",
      startDate: initialRequest?.startDate ?? defaultStart,
      endDate: initialRequest?.endDate ?? defaultStart,
      isHalfDay: initialRequest?.isHalfDay ?? false,
      halfDayPeriod: initialRequest?.halfDayPeriod ?? "",
      reason: initialRequest?.reason ?? "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      attachmentPath: "",
    },
  });

  const isHalfDay = form.watch("isHalfDay");
  const selectedEmployeeId = form.watch("employeeId");
  const selectedLeaveTypeId = form.watch("leaveTypeId");
  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const balances = applyContext?.balances ?? initialBalances;
  const selectedLeaveTypeCode =
    applyContext?.leaveTypes.find((item) => item.id === selectedLeaveTypeId)?.code ??
    lookups.leaveTypes.find((item) => item.id === selectedLeaveTypeId)?.code ??
    "";
  const earliestStart = earliestAllowedLeaveStart(
    selectedLeaveTypeCode,
    applyContext?.notice,
  );
  const startMin =
    isEdit && initialRequest?.startDate && initialRequest.startDate < today
      ? initialRequest.startDate
      : earliestStart;

  useEffect(() => {
    if (!startDate) return;
    const nextStart = startDate < startMin ? startMin : startDate;
    if (nextStart !== startDate) {
      form.setValue("startDate", nextStart, { shouldValidate: true });
    }
    const nextEnd = !endDate || endDate < nextStart ? nextStart : endDate;
    if (nextEnd !== endDate) {
      form.setValue("endDate", nextEnd, { shouldValidate: true });
    }
  }, [endDate, form, startDate, startMin]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setApplyContext(null);
      return;
    }

    if (
      initialApplyContext &&
      initialApplyContext.employee.employeeId === selectedEmployeeId
    ) {
      setApplyContext(initialApplyContext);
      setBalancesLoading(false);
      return;
    }

    let cancelled = false;
    if (initialBalances.length === 0) setBalancesLoading(true);

    void getLeaveApplyContextAction(selectedEmployeeId).then((result) => {
      if (cancelled) return;
      setBalancesLoading(false);
      if (result.success) {
        setApplyContext(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedEmployeeId, initialApplyContext, initialBalances.length]);

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = isEdit
        ? await updateLeaveRequestAction(initialRequest!.id, values)
        : await createLeaveRequestAction(values);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(isEdit ? "Leave request updated" : "Leave request submitted successfully");

      if (onSuccess) {
        onSuccess();
        router.refresh();
        return;
      }

      if (redirectPath) {
        router.push(redirectPath);
        router.refresh();
        return;
      }

      if (!isEdit && result.data) {
        router.push(LEAVE_ROUTES.detail(result.data));
        router.refresh();
        return;
      }

      router.push(LEAVE_ROUTES.list);
      router.refresh();
    });
  });

  const isSelfService = variant === "self";
  const applyPreview =
    applyContext && selectedLeaveTypeId && startDate && endDate
      ? previewLeaveApplication({
          context: applyContext,
          leaveTypeId: selectedLeaveTypeId,
          startDate,
          endDate,
          isHalfDay,
        })
      : null;
  const policyBlocksSubmit = Boolean(applyPreview?.issues.length);

  return (
    <form onSubmit={onSubmit} className={cn("space-y-3", isSelfService && "space-y-2.5")}>
      <LeavePolicyInfo
        compact={isSelfService}
        context={applyContext}
        employeeName={
          lookups.employees.find((employee) => employee.id === selectedEmployeeId)?.label ??
          "Employee"
        }
      />
      <div className={cn("grid gap-3", isSelfService ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2")}>
        {!isSelfService ? (
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
        ) : null}

        <div className={cn("space-y-2", isSelfService && "md:col-span-2 lg:col-span-3")}>
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
          isSelfService ? (
            balancesLoading || balances.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 md:col-span-2 lg:col-span-3">
                <span className="text-xs font-medium text-muted-foreground">Balance</span>
                {balancesLoading && balances.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Loading…</span>
                ) : (
                  balances.map((balance) => (
                    <span
                      key={balance.leaveTypeCode}
                      className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium"
                    >
                      {balance.leaveTypeName}: {formatLeaveDayCount(balance.usedDays)} /{" "}
                      {formatLeaveDayCount(balance.allocatedDays)}
                    </span>
                  ))
                )}
              </div>
            ) : null
          ) : (
          <div className="md:col-span-2">
            <section className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Wallet className="size-4" />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight">
                      Leave balance
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Your available balance before you submit.
                    </p>
                  </div>
                </div>
                {balancesLoading ? (
                  <span className="text-xs text-muted-foreground">Loading…</span>
                ) : null}
              </div>
              {balances.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {balances.map((balance) => (
                    <div
                      key={balance.leaveTypeCode}
                      className="rounded-lg border bg-muted/20 px-4 py-3"
                    >
                      <p className="truncate text-xs text-muted-foreground">
                        {balance.leaveTypeName}
                      </p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        {formatLeaveDayCount(balance.usedDays)} / {formatLeaveDayCount(balance.allocatedDays)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatLeaveDayCount(balance.balanceDays)} available
                      </p>
                    </div>
                  ))}
                </div>
              ) : !balancesLoading ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-dashed bg-muted/20 px-4 py-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      No leave balance allocated yet
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      You can still submit this request. HR will review it and apply
                      the appropriate leave type — if no paid balance is available, it
                      may be treated as Loss of Pay (LOP).
                    </p>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
          )
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            disabled={isPending}
            min={startMin}
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
            min={startDate || startMin}
            {...form.register("endDate")}
          />
          {form.formState.errors.endDate ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.endDate.message}
            </p>
          ) : null}
        </div>

        <div className={cn("flex items-end pb-2", isSelfService ? "lg:col-span-1" : "md:col-span-2")}>
          <label className="flex h-9 items-center gap-2 text-sm">
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

        {applyContext && selectedLeaveTypeId && startDate && endDate ? (
          <div className={cn("md:col-span-2", isSelfService && "lg:col-span-3")}>
            <LeaveDurationPreview
              context={applyContext}
              leaveTypeId={selectedLeaveTypeId}
              startDate={startDate}
              endDate={endDate}
              isHalfDay={isHalfDay}
            />
          </div>
        ) : null}

        {isHalfDay ? (
          <div className={cn("space-y-2 md:col-span-2", isSelfService && "lg:col-span-3")}>
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

        <div className={cn("space-y-2 md:col-span-2", isSelfService && "lg:col-span-3")}>
          <Label htmlFor="reason">Reason</Label>
          <textarea
            id="reason"
            rows={isSelfService ? 2 : 4}
            disabled={isPending}
            className={cn(
              "flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              isSelfService ? "min-h-16" : "min-h-20",
            )}
            {...form.register("reason")}
          />
          {form.formState.errors.reason ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.reason.message}
            </p>
          ) : null}
        </div>

        {!isSelfService ? (
          <>
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
              <PhoneInput
                id="emergencyContactPhone"
                value={form.watch("emergencyContactPhone") ?? ""}
                onChange={(value) =>
                  form.setValue("emergencyContactPhone", value, { shouldValidate: true })
                }
                disabled={isPending}
                error={form.formState.errors.emergencyContactPhone?.message}
              />
            </div>
          </>
        ) : null}
      </div>

      <div className={cn("flex items-center justify-end gap-2 border-t", isSelfService ? "pt-2.5" : "pt-3")}>
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => {
            if (onCancel) {
              onCancel();
              return;
            }
            router.push(redirectPath ?? LEAVE_ROUTES.list);
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || policyBlocksSubmit}>
          {isEdit
            ? "Save changes"
            : isSelfService
              ? "Submit request"
              : "Submit leave request"}
        </Button>
      </div>
    </form>
  );
}
