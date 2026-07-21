"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  buildStatusItems,
  PerformanceFilters,
  PerformancePagination,
} from "@/components/performance/performance-filters";
import {
  GoalPriorityBadge,
  GoalStatusBadge,
} from "@/components/performance/performance-status-badge";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { createGoalAction } from "@/lib/performance/actions";
import { GOAL_STATUS_LABELS } from "@/lib/performance/constants";
import {
  BUILTIN_GOAL_PRESETS,
  getDefaultGoalDueDate,
} from "@/lib/performance/goal-presets";
import { goalFormSchema } from "@/lib/validations/performance";
import type { GoalListItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const statusItems = buildStatusItems(GOAL_STATUS_LABELS);

type GoalsManagementProps = {
  records: GoalListItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  departments: LookupOption[];
  cycles: LookupOption[];
  categories: string[];
  search?: string;
  employeeId?: string;
  departmentId?: string;
  cycleId?: string;
  goalStatus?: string;
  canCreate: boolean;
};

export function GoalForm({
  employees,
}: {
  employees: LookupOption[];
  cycles: LookupOption[];
  categories: string[];
}) {
  const router = useRouter();
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

  const templateOptions = useMemo(
    () =>
      BUILTIN_GOAL_PRESETS.map((preset) => ({
        value: preset.id,
        label: preset.title,
      })),
    [],
  );

  function applyTemplate(id: string) {
    setTemplateId(id);
    if (!id) return;

    const preset = BUILTIN_GOAL_PRESETS.find((item) => item.id === id);
    if (!preset) return;

    form.reset({
      employeeId: form.getValues("employeeId"),
      cycleId: form.getValues("cycleId"),
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
        router.refresh();
      });
    })();
  }

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">Assign goal / OKR</h2>
        <p className="text-xs text-muted-foreground">
          Choose a template, adjust if needed, and assign to an employee.
        </p>
      </div>

      <div className="space-y-4">
        <Field label="Template">
          <LabeledSelect
            items={[{ value: "", label: "Select a goal template" }, ...templateOptions]}
            value={templateId}
            onValueChange={applyTemplate}
            disabled={isPending}
          />
        </Field>

        {templateId ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Employee">
              <EmployeeSelect
                employees={employees}
                value={form.watch("employeeId")}
                onValueChange={(value) =>
                  form.setValue("employeeId", value, { shouldValidate: true })
                }
                disabled={isPending}
              />
            </Field>
            <Field label="Goal title">
              <Input disabled={isPending} {...form.register("title")} />
            </Field>
            <Field label="Due date">
              <Input type="date" disabled={isPending} {...form.register("dueDate")} />
            </Field>
            <Field label="Key result 1">
              <Input
                disabled={isPending}
                value={keyResult1}
                onChange={(event) => setKeyResult1(event.target.value)}
              />
            </Field>
            <Field label="Key result 2" className="md:col-span-2">
              <Input
                disabled={isPending}
                value={keyResult2}
                onChange={(event) => setKeyResult2(event.target.value)}
              />
            </Field>
            <div className="md:col-span-2">
              <Button type="button" disabled={isPending} onClick={handleCreate}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Assign goal
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
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
}: Omit<GoalsManagementProps, "canCreate" | "categories">) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
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
          searchPlaceholder="Search goals..."
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {records.length === 0 ? (
          <EmptyState
            title="No goals yet"
            description="Select a template above to assign a goal."
            className="border-0"
          />
        ) : (
          <div className="max-h-[24rem] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
                <tr className="text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Goal</th>
                  <th className="px-4 py-3 font-medium">Progress</th>
                  <th className="px-4 py-3 font-medium">Key results</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-t align-middle">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.employeeName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.title}</div>
                      <GoalPriorityBadge priority={row.goalPriority} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${row.currentProgress}%` }}
                          />
                        </div>
                        <span className="tabular-nums">{row.currentProgress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {row.completedMilestones}/{row.milestoneCount}
                    </td>
                    <td className="px-4 py-3">
                      <GoalStatusBadge status={row.goalStatus} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.dueDate ? format(new Date(row.dueDate), "MMM d, yyyy") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <PerformancePagination page={page} pageSize={pageSize} total={total} />
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `${className} space-y-2` : "space-y-2"}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
