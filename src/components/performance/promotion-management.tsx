"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { PromotionDetailModal } from "@/components/performance/promotion-detail-modal";
import {
  buildStatusItems,
  matchesTextQuery,
  paginateItems,
  PerformanceFilters,
  PerformancePagination,
  type PerformanceFilterUpdates,
} from "@/components/performance/performance-filters";
import { PerformanceConfirmModal } from "@/components/performance/performance-confirm-modal";
import { PromotionStatusBadge } from "@/components/performance/performance-status-badge";
import {
  DeleteIconButton,
  EditIconButton,
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import { EmployeeSelect, LabeledSelect } from "@/components/payroll/payroll-select";
import {
  createPromotionAction,
  deletePromotionAction,
  fetchPromotionEmployeeContextAction,
} from "@/lib/performance/actions";
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
        className="space-y-4"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold">Promotion recommendation</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Nominate an employee for promotion with role and compensation details.
            </p>
          </div>
          <Button type="submit" className="h-9 w-full shrink-0 sm:w-auto" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit recommendation
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Employee">
            <EmployeeSelect
              employees={employees}
              value={form.watch("employeeId")}
              onValueChange={(v) => {
                form.setValue("employeeId", v, { shouldValidate: true });
                if (!v) return;
                fetchPromotionEmployeeContextAction(v).then((context) => {
                  if (!context) return;
                  if (context.currentSalary != null) {
                    form.setValue("currentSalary", context.currentSalary);
                  }
                  if (context.designationId) {
                    form.setValue("currentDesignationId", context.designationId);
                  }
                });
              }}
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
            <Input
              type="number"
              min={0}
              disabled={isPending}
              {...form.register("recommendedSalary")}
            />
          </Field>
          <Field label="Reason" className="md:col-span-2">
            <Input
              disabled={isPending}
              {...form.register("reason")}
              placeholder="Promotion justification"
            />
          </Field>
        </div>
      </form>
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

export function PromotionsTable({
  records,
  pageSize,
  employees,
  designations,
  canApprove,
  canEdit,
  canDelete,
}: {
  records: PromotionListItem[];
  total?: number;
  page?: number;
  pageSize: number;
  employees: LookupOption[];
  designations: LookupOption[];
  employeeId?: string;
  promotionStatus?: string;
  canApprove: boolean;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [viewRecord, setViewRecord] = useState<PromotionListItem | null>(null);
  const [editRecord, setEditRecord] = useState<PromotionListItem | null>(null);
  const [deleting, setDeleting] = useState<PromotionListItem | null>(null);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [promotionStatus, setPromotionStatus] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return records.filter((row) => {
      if (employeeId && row.employeeId !== employeeId) return false;
      if (promotionStatus && row.promotionStatus !== promotionStatus) return false;
      return matchesTextQuery(
        [
          row.employeeName,
          row.employeeCode,
          row.departmentName,
          row.currentDesignation,
          row.recommendedDesignation,
        ],
        search,
      );
    });
  }, [records, search, employeeId, promotionStatus]);

  const paged = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, employeeId, promotionStatus]);

  useEffect(() => {
    if (page !== paged.page) setPage(paged.page);
  }, [page, paged.page]);

  function handleFiltersChange(updates: PerformanceFilterUpdates) {
    if ("search" in updates) setSearch(updates.search ?? "");
    if ("employeeId" in updates) setEmployeeId(updates.employeeId);
    if ("promotionStatus" in updates) setPromotionStatus(updates.promotionStatus);
    setPage(1);
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deletePromotionAction({ promotionId: deleting.id });
      if (!result.success) toast.error(result.message);
      else {
        toast.success("Promotion deleted");
        setDeleting(null);
        router.refresh();
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <PerformanceFilters
          employees={employees}
          statusItems={statusItems}
          statusKey="promotionStatus"
          statusValue={promotionStatus}
          employeeId={employeeId}
          search={search}
          searchPlaceholder="Search promotions..."
          showDepartment={false}
          showCycle={false}
          onFiltersChange={handleFiltersChange}
        />
      </div>

      <PerformanceTableShell
        empty={
          <EmptyState
            title="No promotions"
            description="Submit a promotion recommendation to start the approval workflow."
            className="border-0"
          />
        }
      >
        {paged.rows.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-30 bg-black text-left shadow-[0_1px_0_rgba(255,255,255,0.08)]">
              <tr className="text-left text-muted-foreground">
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Employee</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Current role</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Recommended role</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Salary change</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Status</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Recommended by</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle" />
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3">
                    <div className="font-medium">{row.employeeName}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.departmentName ?? row.employeeCode}
                    </div>
                  </td>
                  <td className="px-4 py-3">{row.currentDesignation ?? "—"}</td>
                  <td className="px-4 py-3">{row.recommendedDesignation ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.currentSalary != null && row.recommendedSalary != null
                      ? `₹${row.currentSalary.toLocaleString()} → ₹${row.recommendedSalary.toLocaleString()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <PromotionStatusBadge status={row.promotionStatus} />
                  </td>
                  <td className="px-4 py-3">{row.recommendedByName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <ViewIconButton onClick={() => setViewRecord(row)} />
                      {canEdit ? <EditIconButton onClick={() => setEditRecord(row)} /> : null}
                      {canDelete ? <DeleteIconButton onClick={() => setDeleting(row)} /> : null}
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </PerformanceTableShell>

      <PerformancePagination
        page={paged.page}
        pageSize={pageSize}
        total={paged.total}
        onPageChange={setPage}
      />

      <PromotionDetailModal
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
        canApprove={canApprove}
      />

      <PromotionDetailModal
        record={editRecord}
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        canEdit
        designations={designations}
      />

      <PerformanceConfirmModal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this promotion?"
        description="This recommendation will be removed from the promotion tracker."
        confirmLabel="Delete promotion"
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </section>
  );
}
