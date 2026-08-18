"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/common/modal";
import { KpiDetailModal } from "@/components/performance/kpi-detail-modal";
import { KpiQuickAssign } from "@/components/performance/kpi-quick-assign";
import { PerformanceConfirmModal } from "@/components/performance/performance-confirm-modal";
import { KpiStatusBadge } from "@/components/performance/performance-status-badge";
import {
  buildStatusItems,
  matchesTextQuery,
  paginateItems,
  PerformanceFilters,
  PerformancePagination,
  type PerformanceFilterUpdates,
} from "@/components/performance/performance-filters";
import {
  DeleteIconButton,
  EditIconButton,
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toSelectItems } from "@/components/payroll/select-utils";
import {
  deleteKpiAction,
  fetchKpisListAction,
  updateKpiProgressAction,
} from "@/lib/performance/actions";
import {
  KPI_MEASUREMENT_LABELS,
  KPI_PERIOD_LABELS,
  KPI_STATUS_LABELS,
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_ROUTES,
} from "@/lib/performance/constants";
import { formatKpiTarget } from "@/lib/performance/services/performance-utils";
import { kpiProgressSchema } from "@/lib/validations/performance";
import { cn } from "@/lib/utils";
import type { KpiListItem, KpiTemplateItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const periodItems = toSelectItems(KPI_PERIOD_LABELS);
const statusItems = buildStatusItems(KPI_STATUS_LABELS);
const FILTER_TRIGGER = "h-9 w-full min-w-0";
const FILTER_CONTENT = "min-w-[var(--radix-select-trigger-width)]";


type KpiWorkflowProps = {
  departments: LookupOption[];
  designations: LookupOption[];
  employees: LookupOption[];
  templates: KpiTemplateItem[];
  canManageTemplates: boolean;
  canAssign: boolean;
  onAssigned?: () => void;
};

export function KpiWorkflow({
  employees,
  templates,
  canAssign,
  onAssigned,
}: KpiWorkflowProps) {
  if (!canAssign) return null;

  return (
    <KpiQuickAssign
      employees={employees}
      templates={templates.filter((t) => t.isActive)}
      canAssign={canAssign}
      onAssigned={onAssigned}
    />
  );
}

type KpiTableProps = {
  records: KpiListItem[];
  total?: number;
  page?: number;
  pageSize: number;
  departments?: LookupOption[];
  designations?: LookupOption[];
  search?: string;
  departmentId?: string;
  designationId?: string;
  kpiStatus?: string;
  kpiPeriod?: string;
  canManageKpis: boolean;
  currentEmployeeId: string;
  onKpisChanged?: () => void;
};

export function KpiTable({
  records,
  pageSize,
  canManageKpis,
  currentEmployeeId,
  onKpisChanged,
}: KpiTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<KpiListItem | null>(null);
  const [viewing, setViewing] = useState<KpiListItem | null>(null);
  const [deleting, setDeleting] = useState<KpiListItem | null>(null);
  const [search, setSearch] = useState("");
  const [kpiStatus, setKpiStatus] = useState<string | undefined>();
  const [kpiPeriod, setKpiPeriod] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return records.filter((row) => {
      if (kpiStatus && row.kpiStatus !== kpiStatus) return false;
      if (kpiPeriod && row.kpiPeriod !== kpiPeriod) return false;
      return matchesTextQuery(
        [row.title, row.employeeName, row.employeeCode, row.departmentName],
        search,
      );
    });
  }, [records, search, kpiStatus, kpiPeriod]);

  const paged = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, kpiStatus, kpiPeriod]);

  useEffect(() => {
    if (page !== paged.page) setPage(paged.page);
  }, [page, paged.page]);

  function handleFiltersChange(updates: PerformanceFilterUpdates) {
    if ("search" in updates) setSearch(updates.search ?? "");
    if ("kpiStatus" in updates) setKpiStatus(updates.kpiStatus);
    setPage(1);
  }

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const result = await deleteKpiAction({ kpiId: deleting.id });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("KPI deleted");
      setDeleting(null);
      onKpisChanged?.();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Assigned KPIs</h2>
        <p className="text-xs text-muted-foreground">
          Your assignment history appears here. Click View to open details in a popup.
        </p>
      </div>

      <PerformanceFilters
        employees={[]}
        statusItems={statusItems}
        statusKey="kpiStatus"
        statusValue={kpiStatus}
        search={search}
        searchPlaceholder="Search employee or KPI…"
        variant="bar"
        showEmployee={false}
        showDepartment={false}
        showCycle={false}
        className="rounded-lg border bg-muted/10 p-3"
        onFiltersChange={handleFiltersChange}
        extraFilters={
          <LabeledSelect
            items={[{ value: "all", label: "All periods" }, ...periodItems]}
            value={kpiPeriod ?? "all"}
            onValueChange={(v) => {
              setKpiPeriod(v === "all" ? undefined : v);
              setPage(1);
            }}
            placeholder="Review period"
            triggerClassName={FILTER_TRIGGER}
            contentClassName={FILTER_CONTENT}
          />
        }
      />

      <PerformanceTableShell
        className="max-h-[min(36vh,320px)]"
        empty={
          <EmptyState
            title="No KPI assignments yet"
            description="Pick a template above and assign it to an employee to start tracking."
            className="border-0 py-8"
          />
        }
      >
        {paged.rows.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-3 py-2.5 font-medium">Employee</th>
                <th className="px-3 py-2.5 font-medium">Employee ID</th>
                <th className="px-3 py-2.5 font-medium">KPI</th>
                <th className="px-3 py-2.5 font-medium">Target</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Due</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{row.employeeName}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.employeeCode}</td>
                  <td className="px-3 py-2.5 font-medium">{row.title}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {formatKpiTarget(row.targetValue, row.measurementType)}
                  </td>
                  <td className="px-3 py-2.5">
                    <KpiStatusBadge status={row.kpiStatus} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                    {row.endDate ? format(new Date(row.endDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <TableActions>
                      <ViewIconButton onClick={() => setViewing(row)} />
                      {row.kpiStatus !== "completed" &&
                      (canManageKpis || row.managerEmployeeId === currentEmployeeId) ? (
                        <EditIconButton onClick={() => setEditing(row)} />
                      ) : null}
                      {canManageKpis ? (
                        <DeleteIconButton onClick={() => setDeleting(row)} />
                      ) : null}
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

      {editing ? (
        <KpiProgressModal
          record={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}

      <KpiDetailModal
        record={viewing}
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
        canManage={canManageKpis}
        canUpdate={
          viewing
            ? viewing.kpiStatus !== "completed" &&
              (canManageKpis || viewing.managerEmployeeId === currentEmployeeId)
            : false
        }
        onUpdateProgress={() => {
          if (viewing) setEditing(viewing);
        }}
        onChanged={onKpisChanged}
      />

      <PerformanceConfirmModal
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this KPI?"
        description="The employee will no longer see this assigned KPI."
        confirmLabel="Delete KPI"
        isPending={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function KpiWorkspace({
  canAssign,
  formProps,
  tableProps,
  listBasePath = PERFORMANCE_ROUTES.kpis,
}: {
  canAssign: boolean;
  formProps: {
    employees: LookupOption[];
    templates: KpiTemplateItem[];
  };
  tableProps: Omit<Parameters<typeof KpiTable>[0], never>;
  listBasePath?: string;
}) {
  const router = useRouter();
  const skipServerSyncRef = useRef(false);
  const [records, setRecords] = useState(tableProps.records);

  useEffect(() => {
    if (skipServerSyncRef.current) {
      skipServerSyncRef.current = false;
      return;
    }
    setRecords(tableProps.records);
  }, [tableProps.records]);

  const refreshAssignedKpis = useCallback(async () => {
    const result = await fetchKpisListAction({
      page: 1,
      pageSize: PERFORMANCE_CLIENT_FETCH_SIZE,
    });
    if (!result.success) {
      toast.error(result.message ?? "Could not refresh assigned KPIs");
      return;
    }
    if (!result.data) return;

    skipServerSyncRef.current = true;
    setRecords(result.data.data);
    router.replace(listBasePath);
  }, [listBasePath, router]);

  return (
    <section className="rounded-xl border bg-card shadow-sm">
      {canAssign ? (
        <div className="p-4">
          <KpiQuickAssign
            employees={formProps.employees}
            templates={formProps.templates.filter((t) => t.isActive)}
            canAssign={canAssign}
            onAssigned={refreshAssignedKpis}
          />
        </div>
      ) : null}
      <div className={cn("border-t p-4", !canAssign && "border-t-0")}>
        <KpiTable
          {...tableProps}
          records={records}
          onKpisChanged={refreshAssignedKpis}
        />
      </div>
    </section>
  );
}

function KpiProgressModal({
  record,
  open,
  onOpenChange,
}: {
  record: KpiListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<z.input<typeof kpiProgressSchema>>({
    resolver: zodResolver(kpiProgressSchema),
    defaultValues: {
      kpiId: record.id,
      currentValue: record.currentValue,
      progressComments: record.progressComments ?? "",
      evidenceNotes: record.evidenceNotes ?? "",
    },
  });

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Update KPI Progress"
      description={`${record.employeeName} — ${record.title}`}
      footer={
        <Button
          disabled={isPending}
          onClick={form.handleSubmit((values) => {
            startTransition(async () => {
              const result = await updateKpiProgressAction(values);
              if (!result.success) toast.error(result.message);
              else {
                toast.success("KPI progress updated");
                onOpenChange(false);
                router.refresh();
              }
            });
          })}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Progress
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p>
            Target: {formatKpiTarget(record.targetValue, record.measurementType)} · Weightage:{" "}
            {record.weightage}%
          </p>
        </div>
        <Field label={`Current Progress (${KPI_MEASUREMENT_LABELS[record.measurementType]})`}>
          <Input
            type="number"
            min={0}
            step="0.01"
            disabled={isPending}
            {...form.register("currentValue")}
          />
        </Field>
        <Field label="Comments">
          <Input disabled={isPending} placeholder="Manager comments" {...form.register("progressComments")} />
        </Field>
        <Field label="Evidence / Notes">
          <Input disabled={isPending} placeholder="Supporting notes or evidence" {...form.register("evidenceNotes")} />
        </Field>
        <p className="text-xs text-muted-foreground">
          Completion percentage is calculated automatically from the current progress and target.
        </p>
      </div>
    </Modal>
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
