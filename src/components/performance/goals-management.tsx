"use client";

import { format } from "date-fns";
import { Eye, Loader2 } from "lucide-react";
import { useMemo, useState, useTransition, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { GoalDetailModal } from "@/components/performance/goal-detail-modal";
import {
  buildStatusItems,
  PerformanceFilters,
  PerformancePagination,
} from "@/components/performance/performance-filters";
import {
  GoalStatusBadge,
} from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
} from "@/components/performance/performance-ui-primitives";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import { createGoalAction, fetchGoalsListAction } from "@/lib/performance/actions";
import { PERFORMANCE_ROUTES } from "@/lib/performance/constants";
import { GOAL_PRIORITY_LABELS, GOAL_STATUS_LABELS } from "@/lib/performance/constants";
import {
  BUILTIN_GOAL_PRESETS,
  getDefaultGoalDueDate,
} from "@/lib/performance/goal-presets";
import { goalFormSchema } from "@/lib/validations/performance";
import { cn } from "@/lib/utils";
import type { GoalListItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const statusItems = buildStatusItems(GOAL_STATUS_LABELS);
const priorityItems = toSelectItems(GOAL_PRIORITY_LABELS);
const FIELD_CLASS = "h-9";
const EMPLOYEE_SELECT_TRIGGER = "h-9 w-full min-w-[14rem]";

export function GoalForm({
  employees,
  categories,
  onAssigned,
}: {
  employees: LookupOption[];
  categories: string[];
  onAssigned?: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [templateId, setTemplateId] = useState("");
  const [keyResult1, setKeyResult1] = useState("");
  const [keyResult2, setKeyResult2] = useState("");

  const form = useForm<z.input<typeof goalFormSchema>>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      employeeId: "",
      title: "",
      goalPriority: "medium",
      weightage: 20,
      currentProgress: 0,
      goalStatus: "not_started",
      milestones: [],
    },
  });

  const selectedPreset = BUILTIN_GOAL_PRESETS.find((p) => p.id === templateId);

  const templateOptions = useMemo(
    () =>
      BUILTIN_GOAL_PRESETS.map((preset) => ({
        value: preset.id,
        label: preset.title,
      })),
    [],
  );

  const categoryItems = useMemo(
    () =>
      categories.length > 0
        ? categories.map((c) => ({ value: c, label: c }))
        : [{ value: "General", label: "General" }],
    [categories],
  );

  function applyTemplate(id: string) {
    setTemplateId(id);
    if (!id) return;

    const preset = BUILTIN_GOAL_PRESETS.find((item) => item.id === id);
    if (!preset) return;

    form.reset({
      employeeId: form.getValues("employeeId"),
      title: preset.title,
      description: preset.description,
      category: preset.category,
      goalPriority: preset.goalPriority,
      weightage: preset.weightage,
      dueDate: getDefaultGoalDueDate(preset.dueInDays),
      currentProgress: 0,
      goalStatus: "not_started",
      milestones: preset.milestones.map((title) => ({ title })),
    });
    setKeyResult1(preset.milestones[0] ?? "");
    setKeyResult2(preset.milestones[1] ?? "");
  }

  function handleCreate() {
    const milestones = [keyResult1, keyResult2]
      .map((title) => title.trim())
      .filter(Boolean)
      .map((title) => ({ title }));
    form.setValue("milestones", milestones);

    form.handleSubmit((values) => {
      startTransition(async () => {
        const result = await createGoalAction(values);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Goal assigned");
        setTemplateId("");
        setKeyResult1("");
        setKeyResult2("");
        form.reset({
          employeeId: "",
          title: "",
          goalPriority: "medium",
          weightage: 20,
          currentProgress: 0,
          goalStatus: "not_started",
          milestones: [],
        });
        onAssigned?.();
      });
    })();
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Assign goal / OKR</h2>
        <p className="text-xs text-muted-foreground">
          Pick a template, assign, then track progress in the list below.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <CompactField label="Template" className="min-w-0 flex-1">
          <LabeledSelect
            items={[{ value: "", label: "Select a goal template" }, ...templateOptions]}
            value={templateId}
            onValueChange={applyTemplate}
            disabled={isPending}
          />
        </CompactField>
        <Button
          type="button"
          className="h-9 shrink-0 sm:w-auto"
          disabled={isPending || !templateId || !form.watch("employeeId")}
          onClick={handleCreate}
        >
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Assign goal
        </Button>
      </div>

      {selectedPreset ? (
        <p className="text-xs leading-snug text-muted-foreground">
          <span className="font-medium text-foreground">{selectedPreset.title}</span>
          {" — "}
          {selectedPreset.description}
          <span className="text-muted-foreground/80">
            {" "}
            · {selectedPreset.dueInDays} days · {selectedPreset.weightage}% weight
          </span>
        </p>
      ) : null}

      {templateId ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <CompactField label="Employee" className="min-w-[14rem]">
            <EmployeeSelect
              employees={employees}
              value={form.watch("employeeId")}
              onValueChange={(value) =>
                form.setValue("employeeId", value, { shouldValidate: true })
              }
              disabled={isPending}
              triggerClassName={EMPLOYEE_SELECT_TRIGGER}
              contentClassName="min-w-[var(--radix-select-trigger-width)]"
            />
          </CompactField>
          <CompactField label="Goal title">
            <Input className={FIELD_CLASS} disabled={isPending} {...form.register("title")} />
          </CompactField>
          <CompactField label="Category">
            <LabeledSelect
              items={categoryItems}
              value={form.watch("category") ?? ""}
              onValueChange={(v) => form.setValue("category", v)}
              disabled={isPending}
            />
          </CompactField>
          <CompactField label="Priority">
            <LabeledSelect
              items={priorityItems}
              value={form.watch("goalPriority")}
              onValueChange={(v) =>
                form.setValue(
                  "goalPriority",
                  v as z.input<typeof goalFormSchema>["goalPriority"],
                )
              }
              disabled={isPending}
            />
          </CompactField>
          <CompactField label="Weight %">
            <Input
              type="number"
              min={0}
              max={100}
              className={FIELD_CLASS}
              disabled={isPending}
              {...form.register("weightage")}
            />
          </CompactField>
          <CompactField label="Due date">
            <Input
              type="date"
              className={FIELD_CLASS}
              disabled={isPending}
              {...form.register("dueDate")}
            />
          </CompactField>
          <CompactField label="Key result 1">
            <Input
              className={FIELD_CLASS}
              disabled={isPending}
              value={keyResult1}
              onChange={(event) => setKeyResult1(event.target.value)}
            />
          </CompactField>
          <CompactField label="Key result 2" className="sm:col-span-2 lg:col-span-1">
            <Input
              className={FIELD_CLASS}
              disabled={isPending}
              value={keyResult2}
              onChange={(event) => setKeyResult2(event.target.value)}
            />
          </CompactField>
        </div>
      ) : null}
    </div>
  );
}

export function GoalsTable({
  records,
  total,
  page,
  pageSize,
  employees,
  departments,
  cycles,
  search,
  employeeId,
  departmentId,
  cycleId,
  goalStatus,
  initialGoalId,
  canManage = false,
  categories = [],
  onGoalsChanged,
}: {
  records: GoalListItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  departments: LookupOption[];
  cycles: LookupOption[];
  search?: string;
  employeeId?: string;
  departmentId?: string;
  cycleId?: string;
  goalStatus?: string;
  initialGoalId?: string;
  canManage?: boolean;
  categories?: string[];
  onGoalsChanged?: () => void;
}) {
  const [viewId, setViewId] = useState<string | null>(initialGoalId ?? null);

  useEffect(() => {
    if (initialGoalId) setViewId(initialGoalId);
  }, [initialGoalId]);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Assigned goals</h2>
        <p className="text-xs text-muted-foreground">
          Your assignment history appears here. Click View to open details in a popup.
        </p>
      </div>

      <PerformanceFilters
        employees={employees}
        departments={departments}
        cycles={cycles}
        statusItems={statusItems}
        statusKey="goalStatus"
        statusValue={goalStatus}
        employeeId={employeeId}
        departmentId={departmentId}
        cycleId={cycleId}
        search={search}
        searchPlaceholder="Search assigned goals…"
        variant="bar"
        className="rounded-lg border bg-muted/10 p-3"
      />

      <PerformanceTableShell
        className="max-h-[min(36vh,320px)]"
        empty={
          <EmptyState
            title="No goals assigned yet"
            description="Assign a goal using the form above."
            className="border-0 py-8"
          />
        }
      >
        {records.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Employee</th>
                <th className="px-3 py-2.5 font-medium">Goal</th>
                <th className="px-3 py-2.5 font-medium">Key results</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Due</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{row.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{row.departmentName}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{row.title}</div>
                    {row.category ? (
                      <div className="text-xs text-muted-foreground">{row.category}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {row.completedMilestones}/{row.milestoneCount}
                  </td>
                  <td className="px-3 py-2.5">
                    <GoalStatusBadge status={row.goalStatus} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                    {row.dueDate ? format(new Date(row.dueDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <TableActions>
                      <Button size="sm" variant="outline" onClick={() => setViewId(row.id)}>
                        <Eye className="mr-1 size-3.5" />
                        View
                      </Button>
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </PerformanceTableShell>

      <PerformancePagination page={page} pageSize={pageSize} total={total} />

      <GoalDetailModal
        goalId={viewId}
        open={!!viewId}
        onOpenChange={(open) => !open && setViewId(null)}
        variant="assigner"
        canManage={canManage}
        categories={categories}
        onChanged={onGoalsChanged}
      />
    </div>
  );
}

export function GoalsWorkspace({
  canCreate,
  canManage,
  formProps,
  tableProps,
}: {
  canCreate: boolean;
  canManage: boolean;
  formProps: {
    employees: LookupOption[];
    categories: string[];
  };
  tableProps: Omit<Parameters<typeof GoalsTable>[0], never>;
}) {
  const router = useRouter();
  const skipServerSyncRef = useRef(false);
  const [listState, setListState] = useState({
    records: tableProps.records,
    total: tableProps.total,
    page: tableProps.page,
    pageSize: tableProps.pageSize,
    search: tableProps.search,
    employeeId: tableProps.employeeId,
    departmentId: tableProps.departmentId,
    cycleId: tableProps.cycleId,
    goalStatus: tableProps.goalStatus,
  });

  useEffect(() => {
    if (skipServerSyncRef.current) {
      skipServerSyncRef.current = false;
      return;
    }
    setListState({
      records: tableProps.records,
      total: tableProps.total,
      page: tableProps.page,
      pageSize: tableProps.pageSize,
      search: tableProps.search,
      employeeId: tableProps.employeeId,
      departmentId: tableProps.departmentId,
      cycleId: tableProps.cycleId,
      goalStatus: tableProps.goalStatus,
    });
  }, [
    tableProps.records,
    tableProps.total,
    tableProps.page,
    tableProps.pageSize,
    tableProps.search,
    tableProps.employeeId,
    tableProps.departmentId,
    tableProps.cycleId,
    tableProps.goalStatus,
  ]);

  const refreshAssignedGoals = useCallback(async () => {
    const result = await fetchGoalsListAction({
      page: 1,
      pageSize: tableProps.pageSize,
      assignedByMe: true,
    });
    if (!result.success) {
      toast.error(result.message ?? "Could not refresh assigned goals");
      return;
    }
    if (!result.data) return;

    skipServerSyncRef.current = true;
    setListState({
      records: result.data.data,
      total: result.data.total,
      page: result.data.page,
      pageSize: result.data.pageSize,
      search: undefined,
      employeeId: undefined,
      departmentId: undefined,
      cycleId: undefined,
      goalStatus: undefined,
    });
    router.replace(PERFORMANCE_ROUTES.goals);
  }, [router, tableProps.pageSize]);

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      {canCreate ? (
        <div className="p-4">
          <GoalForm {...formProps} onAssigned={refreshAssignedGoals} />
        </div>
      ) : null}
      <div className={cn("border-t p-4", !canCreate && "border-t-0")}>
        <GoalsTable
          {...tableProps}
          records={listState.records}
          total={listState.total}
          page={listState.page}
          pageSize={listState.pageSize}
          search={listState.search}
          employeeId={listState.employeeId}
          departmentId={listState.departmentId}
          cycleId={listState.cycleId}
          goalStatus={listState.goalStatus}
          canManage={canManage}
          categories={formProps.categories}
          onGoalsChanged={refreshAssignedGoals}
        />
      </div>
    </section>
  );
}

function CompactField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
