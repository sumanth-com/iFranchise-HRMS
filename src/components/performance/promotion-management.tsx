"use client";

import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { PromotionStatusBadge } from "@/components/performance/performance-status-badge";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import { approvePromotionAction, createPromotionAction } from "@/lib/performance/actions";
import { PROMOTION_STATUS_LABELS } from "@/lib/performance/constants";
import { promotionFormSchema } from "@/lib/validations/performance";
import type { PromotionListItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const statusItems = buildStatusItems(PROMOTION_STATUS_LABELS);

export function PromotionForm({
  employees,
  designations,
}: {
  employees: LookupOption[];
  designations: LookupOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof promotionFormSchema>>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: { employeeId: "" },
  });

  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-medium">Promotion recommendation</h2>
      <form
        onSubmit={form.handleSubmit((values) => {
          startTransition(async () => {
            const result = await createPromotionAction(values);
            if (!result.success) toast.error(result.message);
            else {
              toast.success("Promotion recommended");
              form.reset();
              router.refresh();
            }
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
        <Field label="Recommended designation">
          <LabeledSelect
            items={designations.map((d) => ({ value: d.id, label: d.label }))}
            value={form.watch("recommendedDesignationId") ?? ""}
            onValueChange={(v) => form.setValue("recommendedDesignationId", v || null)}
            disabled={isPending}
          />
        </Field>
        <Field label="Current salary">
          <Input type="number" min={0} disabled={isPending} {...form.register("currentSalary")} />
        </Field>
        <Field label="Recommended salary">
          <Input type="number" min={0} disabled={isPending} {...form.register("recommendedSalary")} />
        </Field>
        <Field label="Reason" className="md:col-span-2">
          <Input disabled={isPending} {...form.register("reason")} placeholder="Promotion justification" />
        </Field>
        <div className="md:col-span-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit recommendation
          </Button>
        </div>
      </form>
    </section>
  );
}

export function PromotionsTable({
  records,
  total,
  page,
  pageSize,
  employees,
  employeeId,
  promotionStatus,
  canApprove,
}: {
  records: PromotionListItem[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  employeeId?: string;
  promotionStatus?: string;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <PerformanceFilters
          employees={employees}
          statusItems={statusItems}
          statusKey="promotionStatus"
          statusValue={promotionStatus}
          employeeId={employeeId}
          searchPlaceholder="Search promotions..."
        />
      </div>
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {records.length === 0 ? (
          <EmptyState title="No promotions" description="Submit a promotion recommendation." className="border-0" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Current role</th>
                <th className="px-4 py-3">Recommended role</th>
                <th className="px-4 py-3">Salary change</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Recommended by</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {records.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.employeeName}</div>
                    <div className="text-xs text-muted-foreground">{row.departmentName ?? row.employeeCode}</div>
                  </td>
                  <td className="px-4 py-3">{row.currentDesignation ?? "—"}</td>
                  <td className="px-4 py-3">{row.recommendedDesignation ?? "—"}</td>
                  <td className="px-4 py-3">
                    {row.currentSalary != null && row.recommendedSalary != null
                      ? `₹${row.currentSalary.toLocaleString()} → ₹${row.recommendedSalary.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3"><PromotionStatusBadge status={row.promotionStatus} /></td>
                  <td className="px-4 py-3">{row.recommendedByName ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {canApprove && ["pending", "recommended"].includes(row.promotionStatus) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await approvePromotionAction({ promotionId: row.id });
                            if (!result.success) toast.error(result.message);
                            else {
                              toast.success("Promotion approved");
                              router.refresh();
                            }
                          })
                        }
                      >
                        <CheckCircle2 className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <PerformancePagination page={page} pageSize={pageSize} total={total} />
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
