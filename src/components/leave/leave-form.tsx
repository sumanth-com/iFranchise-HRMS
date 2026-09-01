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
  clearStaleServerActionReloadFlag,
  isStaleServerActionError,
  reloadForStaleServerAction,
} from "@/lib/errors/stale-server-action";
import {
  LEAVE_APPLY_TYPE_CODES,
  HALF_DAY_PERIOD_LABELS,
  LEAVE_ROUTES,
  sortByLeaveTypeCode,
} from "@/lib/leave/constants";
import {
  isPeriodLeaveCode,
  isPeriodLeaveEligible,
} from "@/lib/leave/period-leave-eligibility";
import { LeaveDurationPreview, LeavePolicyInfo } from "@/components/leave/leave-apply-policy-panel";
import { formatLeaveDayCount } from "@/lib/leave/services/leave-usage";
import { formatLeaveBalanceUsedTotal } from "@/lib/leave/leave-balance-display";
import { previewLeaveApplication } from "@/lib/leave/services/leave-apply-preview";
import { isOptionalHolidayCode, optionalHolidayDisplayDate } from "@/lib/leave/optional-holiday";
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

function formatLeaveDays(value: number): string {
  const rounded = Number(value.toFixed(2));
  return `${rounded} ${rounded === 1 ? "day" : "days"}`;
}

function explainLeaveSubmitError(message: string): {
  title: string;
  body: string;
  hint?: string;
} {
  const normalized = message.toLowerCase();
  if (normalized.includes("loss of pay")) {
    return {
      title: "Applied as Loss of Pay",
      body: message,
      hint: "You can still submit this request for approval.",
    };
  }
  if (normalized.includes("overlap")) {
    return {
      title: "These dates already have leave",
      body: "You already have a pending or approved leave on one or more of these dates.",
      hint: "Choose different dates, or cancel the existing request first, then try again.",
    };
  }
  if (normalized.includes("balance") || normalized.includes("exceed")) {
    return {
      title: "Not enough leave balance",
      body: message,
      hint: "Shorten the leave period or pick another leave type with available days.",
    };
  }
  if (normalized.includes("notice") || normalized.includes("tomorrow")) {
    return {
      title: "Advance notice required",
      body: message,
    };
  }
  return {
    title: "Please check your leave details",
    body: message,
  };
}

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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSelfService = variant === "self";

  const employeeItems = lookups.employees.map((employee) => ({
    value: employee.id,
    label: employee.code
      ? `${employee.label} (${employee.code})`
      : employee.label,
  }));

  const isEdit = mode === "edit" && Boolean(initialRequest?.id);

  // The apply context is reloaded per selected employee, so this follows the
  // applicant rather than the signed-in user when HR applies on someone's behalf.
  // Before it resolves, the server-filtered balances already say whether the
  // applicant is eligible, which avoids the row flashing in and out.
  const periodLeaveAllowed = applyContext
    ? isPeriodLeaveEligible(
        applyContext.employee.gender,
        applyContext.probationRules.periodLeaveFemaleOnly,
      )
    : initialBalances.some((item) => isPeriodLeaveCode(item.leaveTypeCode));

  const leaveTypeItems = sortByLeaveTypeCode(
    lookups.leaveTypes.filter((leaveType) => Boolean(leaveType.id)),
  )
    .filter((leaveType) => {
      if (!leaveType.code) return !isSelfService;
      const code = leaveType.code.toUpperCase();
      if (isSelfService) return code === "CL" || code === "EL" || code === "OH";
      if (isEdit && initialRequest?.leaveTypeId === leaveType.id) return true;
      // Menstruation Leave is offered only to employees the server would accept
      // it from, so an ineligible applicant never sees it in the list.
      if (isPeriodLeaveCode(code) && !periodLeaveAllowed) return false;
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
  const isOptionalHoliday = isOptionalHolidayCode(selectedLeaveTypeCode);
  const optionalHolidayChoices = (applyContext?.optionalHolidays ?? []).filter(
    (item) => item.status === "available",
  );
  const ohRemaining =
    balances.find((row) => isOptionalHolidayCode(row.leaveTypeCode))?.balanceDays ?? 0;
  const selectableOptionalHolidays = ohRemaining >= 1 ? optionalHolidayChoices : [];
  const earliestStart = earliestAllowedLeaveStart(
    selectedLeaveTypeCode,
    applyContext?.notice,
    undefined,
    { isHalfDay },
  );
  const startMin =
    isEdit && initialRequest?.startDate && initialRequest.startDate < today
      ? initialRequest.startDate
      : earliestStart;

  useEffect(() => {
    if (isOptionalHoliday) return;
    if (!startDate) return;
    // When half-day is enabled, today is allowed — do not push the user forward.
    const nextStart = startDate < startMin ? startMin : startDate;
    if (nextStart !== startDate) {
      form.setValue("startDate", nextStart, { shouldValidate: true });
    }
    const nextEnd = !endDate || endDate < nextStart ? nextStart : endDate;
    if (nextEnd !== endDate) {
      form.setValue("endDate", nextEnd, { shouldValidate: true });
    }
  }, [endDate, form, startDate, startMin, isOptionalHoliday]);

  const optionalHolidayDateKey = selectableOptionalHolidays.map((item) => item.date).join(",");

  useEffect(() => {
    if (!isOptionalHoliday) return;
    form.setValue("isHalfDay", false, { shouldValidate: true });
    form.setValue("halfDayPeriod", "", { shouldValidate: true });
    const dates = optionalHolidayDateKey ? optionalHolidayDateKey.split(",") : [];
    const current = form.getValues("startDate");
    const next = dates.includes(current) ? current : dates[0];
    if (next) {
      form.setValue("startDate", next, { shouldValidate: true });
      form.setValue("endDate", next, { shouldValidate: true });
    }
  }, [form, isOptionalHoliday, optionalHolidayDateKey]);

  function applyHalfDayToggle(checked: boolean) {
    form.setValue("isHalfDay", checked, { shouldValidate: true });
    if (checked) {
      // Half-day leave may start today (no advance-notice lock).
      const sameDayStart = earliestAllowedLeaveStart(
        selectedLeaveTypeCode || CASUAL_LEAVE_CODE,
        applyContext?.notice,
        undefined,
        { isHalfDay: true },
      );
      form.setValue("startDate", sameDayStart, { shouldValidate: true });
      form.setValue("endDate", sameDayStart, { shouldValidate: true });
      return;
    }
    form.setValue("halfDayPeriod", "", { shouldValidate: true });
    const nextStart = earliestAllowedLeaveStart(
      selectedLeaveTypeCode || CASUAL_LEAVE_CODE,
      applyContext?.notice,
      undefined,
      { isHalfDay: false },
    );
    const currentStart = form.getValues("startDate");
    if (!currentStart || currentStart < nextStart) {
      form.setValue("startDate", nextStart, { shouldValidate: true });
      form.setValue("endDate", nextStart, { shouldValidate: true });
    }
  }

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

    void getLeaveApplyContextAction(selectedEmployeeId)
      .then((result) => {
        if (cancelled) return;
        setBalancesLoading(false);
        if (result.success) {
          setApplyContext(result.data);
          clearStaleServerActionReloadFlag();
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setBalancesLoading(false);
        if (isStaleServerActionError(error)) {
          reloadForStaleServerAction();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEmployeeId, initialApplyContext, initialBalances.length]);

  const showErrorsInForm = isSelfService || Boolean(onCancel);

  useEffect(() => {
    setSubmitError(null);
  }, [selectedLeaveTypeId, startDate, endDate, isHalfDay]);

  const onSubmit = form.handleSubmit((values) => {
    setSubmitError(null);
    startTransition(async () => {
      const payload = isSelfService ? { ...values, isHalfDay: false, halfDayPeriod: "" } : values;
      const result = isEdit
        ? await updateLeaveRequestAction(initialRequest!.id, payload)
        : await createLeaveRequestAction(payload);

      if (!result.success) {
        // Dialog / self-service modal: keep the error inside the popup (no toast).
        if (showErrorsInForm) {
          setSubmitError(result.message);
        } else {
          toast.error(result.message);
        }
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

  const applyPreview =
    applyContext && selectedLeaveTypeId && startDate && endDate
      ? previewLeaveApplication({
          context: applyContext,
          leaveTypeId: selectedLeaveTypeId,
          startDate,
          endDate,
          isHalfDay: isSelfService ? false : isHalfDay,
        })
      : null;
  // A shortfall in paid balance is not a blocker: the excess is submitted as LOP.
  const policyBlocksSubmit = Boolean(applyPreview?.blockingIssues.length);
  const lopSplit =
    applyPreview && applyPreview.split.lopDays > 0 ? applyPreview.split : null;
  const submitErrorCopy = submitError ? explainLeaveSubmitError(submitError) : null;

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
      <div className="grid gap-3 md:grid-cols-2">
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

        <div className={cn("space-y-2", isSelfService && "md:col-span-2")}>
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

        {selectedEmployeeId && !isSelfService ? (
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
                        {formatLeaveBalanceUsedTotal(balance)}
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
        ) : null}

        {!isSelfService && !isOptionalHoliday ? (
          <div className="flex flex-col justify-end gap-1 md:col-span-2">
            <label className="flex h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border"
                disabled={isPending}
                checked={isHalfDay}
                onChange={(event) => applyHalfDayToggle(event.currentTarget.checked)}
              />
              Half day leave
            </label>
            {isHalfDay ? (
              <p className="text-[11px] leading-snug text-muted-foreground">
                Half day can be applied for today.
              </p>
            ) : null}
          </div>
        ) : null}

        {isOptionalHoliday ? (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="optionalHolidayDate">Optional Holiday date</Label>
            {selectableOptionalHolidays.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {ohRemaining < 1
                  ? "You have no Optional Holiday remaining this year."
                  : "There are no upcoming Optional Holidays you can select."}
              </p>
            ) : (
              <Select
                items={selectableOptionalHolidays.map((item) => ({
                  value: item.date,
                  label: `${item.name} · ${optionalHolidayDisplayDate(item.date)} · ${item.day}`,
                }))}
                value={startDate}
                onValueChange={(value) => {
                  if (!value) return;
                  form.setValue("startDate", value, { shouldValidate: true });
                  form.setValue("endDate", value, { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger id="optionalHolidayDate" className="h-8 w-full min-w-0">
                  <SelectValue placeholder="Select an Optional Holiday" />
                </SelectTrigger>
                <SelectContent align="start" alignItemWithTrigger={false}>
                  {selectableOptionalHolidays.map((item) => (
                    <SelectItem key={item.id} value={item.date}>
                      {item.name} · {optionalHolidayDisplayDate(item.date)} · {item.day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ) : (
          <>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            key={`start-${startMin}-${isHalfDay ? "half" : "full"}`}
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
            key={`end-${startMin}-${isHalfDay ? "half" : "full"}`}
            id="endDate"
            type="date"
            disabled={isPending || (!isSelfService && isHalfDay)}
            min={startDate || startMin}
            {...form.register("endDate")}
          />
          {form.formState.errors.endDate ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.endDate.message}
            </p>
          ) : null}
        </div>
          </>
        )}

        {isSelfService && applyPreview ? (
          <div className="md:col-span-2 space-y-2">
            <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground tabular-nums">
                  {formatLeaveDays(applyPreview.duration.totalLeaveDays)} requested
                </span>
              </p>
            </div>
            {applyPreview.blockingIssues.map((issue) => {
              const isOverlap = issue.code === "overlap";
              const isNotice = issue.code === "notice";
              return (
                <div
                  key={issue.code}
                  className={cn(
                    "rounded-lg border px-3 py-2.5",
                    isOverlap || isNotice
                      ? "border-amber-500/35 bg-amber-500/10"
                      : "border-destructive/30 bg-destructive/10",
                  )}
                >
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isOverlap || isNotice
                        ? "text-amber-950 dark:text-amber-100"
                        : "text-destructive",
                    )}
                  >
                    {isOverlap
                      ? "These dates already have leave"
                      : isNotice
                        ? "Advance notice required"
                        : "Please check these dates"}
                  </p>
                  <p
                    className={cn(
                      "mt-0.5 text-xs leading-relaxed",
                      isOverlap || isNotice
                        ? "text-amber-900/90 dark:text-amber-100/80"
                        : "text-destructive/90",
                    )}
                  >
                    {isOverlap
                      ? "You already have a pending or approved leave on one or more of these dates. Choose different dates, or cancel the existing request first."
                      : issue.message}
                  </p>
                </div>
              );
            })}
          </div>
        ) : applyContext && selectedLeaveTypeId && startDate && endDate ? (
          <div className="md:col-span-2">
            <LeaveDurationPreview
              context={applyContext}
              leaveTypeId={selectedLeaveTypeId}
              startDate={startDate}
              endDate={endDate}
              isHalfDay={isHalfDay}
            />
          </div>
        ) : null}

        {isHalfDay && !isSelfService ? (
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

      <div className={cn("space-y-2 border-t", isSelfService ? "pt-2.5" : "pt-3")}>
        {lopSplit && !isSelfService ? (
          <div
            role="status"
            className="flex gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                {lopSplit.paidDays > 0
                  ? `${formatLeaveDays(lopSplit.paidDays)} paid · ${formatLeaveDays(lopSplit.lopDays)} Loss of Pay`
                  : `${formatLeaveDays(lopSplit.lopDays)} Loss of Pay`}
              </p>
              <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/80">
                {lopSplit.paidDays > 0
                  ? "Your paid balance covers part of this request. The remaining days will be recorded as unpaid leave and deducted in payroll."
                  : "You have no paid balance available for this leave type, so these days will be recorded as unpaid leave and deducted in payroll."}
              </p>
              <p className="text-xs leading-relaxed text-amber-900/75 dark:text-amber-100/65">
                You can still submit this request for approval.
              </p>
            </div>
          </div>
        ) : null}
        {submitErrorCopy ? (
          <div
            role="status"
            className="flex gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
                {submitErrorCopy.title}
              </p>
              <p className="text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/80">
                {submitErrorCopy.body}
              </p>
              {submitErrorCopy.hint ? (
                <p className="text-xs leading-relaxed text-amber-900/75 dark:text-amber-100/65">
                  {submitErrorCopy.hint}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="flex items-center justify-end gap-2">
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
          <Button type="submit" disabled={isPending || policyBlocksSubmit || (isOptionalHoliday && selectableOptionalHolidays.length === 0)}>
            {isEdit
              ? "Save changes"
              : isSelfService
                ? "Submit request"
                : "Submit leave request"}
          </Button>
        </div>
      </div>
    </form>
  );
}
