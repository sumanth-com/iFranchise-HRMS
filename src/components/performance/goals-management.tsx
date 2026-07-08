"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
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
import { toSelectItems } from "@/components/payroll/select-utils";
import { createGoalAction } from "@/lib/performance/actions";
import { GOAL_PRIORITY_LABELS, GOAL_STATUS_LABELS } from "@/lib/performance/constants";
import { goalFormSchema } from "@/lib/validations/performance";
import type { GoalListItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const priorityItems = toSelectItems(GOAL_PRIORITY_LABELS);
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
  cycles,
  categories,
}: {
  employees: LookupOption[];
  cycles: LookupOption[];
  categories: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof goalFormSchema>>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      employeeId: "",
      title: "",
      goalPriority: "medium",
      weightage: 0,
      currentProgress: 0,
      goalStatus: "draft",
      milestones: [],
    },
  });

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-medium">Create goal / OKR</h2>
        <p className="text-xs text-muted-foreground">
          Set objectives with priority, weightage, milestones, and progress tracking.
        </p>
      </div>
      <form
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createGoalAction(values);
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("Goal created");
            form.reset();
            router.refresh();
          });
        })}
        className="grid gap-4 md:grid-cols-2"
      >
        <Field label="Employee">
          <EmployeeSelect
            employees={employees}
            value={form.watch("employeeId")}
            onValueChange={(v) => form.setValue("employeeId", v, { shouldValidate: true })}
            disabled={isPending}
          />
        </Field>
        <Field label="Review cycle">
          <LabeledSelect
            items={[{ value: "", label: "No cycle" }, ...cycles.map((c) => ({ value: c.id, label: c.label }))]}
            value={form.watch("cycleId") ?? ""}
            onValueChange={(v) => form.setValue("cycleId", v || null)}
            disabled={isPending}
          />
        </Field>
        <Field label="Title" className="md:col-span-2">
          <Input disabled={isPending} {...form.register("title")} placeholder="Goal title" />
        </Field>
        <Field label="Category">
          <LabeledSelect
            items={categories.map((c) => ({ value: c, label: c }))}
            value={form.watch("category") ?? ""}
            onValueChange={(v) => form.setValue("category", v)}
            disabled={isPending}
          />
        </Field>
        <Field label="Priority">
          <LabeledSelect
            items={priorityItems}
            value={form.watch("goalPriority")}
            onValueChange={(v) =>
              form.setValue("goalPriority", v as z.input<typeof goalFormSchema>["goalPriority"])
            }
            disabled={isPending}
          />
        </Field>
        <Field label="Weightage (%)">
          <Input type="number" min={0} max={100} disabled={isPending} {...form.register("weightage")} />
        </Field>
        <Field label="Due date">
          <Input type="date" disabled={isPending} {...form.register("dueDate")} />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Input disabled={isPending} {...form.register("description")} placeholder="Goal description" />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create goal
          </Button>
        </div>
      </form>
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
          <EmptyState title="No goals found" description="Create a goal or adjust filters." className="border-0" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Goal</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Weight</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Milestones</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Due</th>
                </tr>
              </thead>
              <tbody>
                {records.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.employeeName}</div>
                      <div className="text-xs text-muted-foreground">{row.departmentName ?? row.employeeCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.title}</div>
                      {row.category ? (
                        <div className="text-xs text-muted-foreground">{row.category}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3"><GoalPriorityBadge priority={row.goalPriority} /></td>
                    <td className="px-4 py-3">{row.weightage}%</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${row.currentProgress}%` }} />
                        </div>
                        <span>{row.currentProgress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.completedMilestones}/{row.milestoneCount}
                    </td>
                    <td className="px-4 py-3"><GoalStatusBadge status={row.goalStatus} /></td>
                    <td className="px-4 py-3">
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
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
