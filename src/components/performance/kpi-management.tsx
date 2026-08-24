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
import { KpiProgressFields } from "@/components/performance/kpi-progress-fields";
import { KpiQuickAssign } from "@/components/performance/kpi-quick-assign";
import { PerformanceConfirmModal } from "@/components/performance/performance-confirm-modal";
import { KpiRowStatusBadge } from "@/components/performance/performance-status-badge";
import {
  buildStatusItems,
  currentMonthValue,
  currentYearValue,
  matchesAssignedPeriod,
  matchesTextQuery,
  MonthYearFilterFields,
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
import {
  deleteKpiAction,
  fetchKpisListAction,
  updateKpiProgressAction,
} from "@/lib/performance/actions";
import {
  KPI_MEASUREMENT_LABELS,
  KPI_STATUS_LABELS,
  PERFORMANCE_CLIENT_FETCH_SIZE,
  PERFORMANCE_ROUTES,
} from "@/lib/performance/constants";
import { applyKpiProgressToListItem } from "@/lib/performance/kpi-update-options";
import {
  calculateKpiCompletion,
  deriveKpiStatus,
  formatKpiProgress,
  formatKpiTarget,
} from "@/lib/performance/services/performance-utils";
import { kpiProgressSchema } from "@/lib/validations/performance";
import { cn } from "@/lib/utils";
import type { KpiListItem, KpiTemplateItem } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const statusItems = buildStatusItems(KPI_STATUS_LABELS);


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
  employees?: LookupOption[];
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
  onKpiRecordUpdated?: (record: KpiListItem) => void;
};

export function KpiTable({
  records,
  pageSize,
  employees = [],
  canManageKpis,
  currentEmployeeId,
  onKpisChanged,
  onKpiRecordUpdated,
}: KpiTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<KpiListItem | null>(null);
  const [viewing, setViewing] = useState<KpiListItem | null>(null);
  const [deleting, setDeleting] = useState<KpiListItem | null>(null);
  const [search, setSearch] = useState("");
  const [employeeId, setEmployeeId] = useState<string | undefined>();
  const [kpiStatus, setKpiStatus] = useState<string | undefined>();
  const [month, setMonth] = useState(currentMonthValue);
  const [year, setYear] = useState(currentYearValue);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return records.filter((row) => {
      if (employeeId && row.employeeId !== employeeId) return false;
      if (kpiStatus && row.kpiStatus !== kpiStatus) return false;
      if (!matchesAssignedPeriod(row.createdAt ?? row.startDate, month, year)) return false;
      return matchesTextQuery(
        [row.title, row.employeeName, row.employeeCode, row.departmentName],
        search,
      );
    });
  }, [records, search, employeeId, kpiStatus, month, year]);

  const paged = useMemo(
    () => paginateItems(filtered, page, pageSize),
    [filtered, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, employeeId, kpiStatus, month, year]);

  useEffect(() => {
    if (page !== paged.page) setPage(paged.page);
  }, [page, paged.page]);

  function handleFiltersChange(updates: PerformanceFilterUpdates) {
    if ("search" in updates) setSearch(updates.search ?? "");
    if ("employeeId" in updates) setEmployeeId(updates.employeeId);
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
          Latest assignments for this month appear first. View, edit, and delete stay separate.
        </p>
      </div>

      <PerformanceFilters
        employees={employees}
        statusItems={statusItems}
        statusKey="kpiStatus"
        statusValue={kpiStatus}
        employeeId={employeeId}
        search={search}
        searchPlaceholder="Search employee or KPI…"
        variant="bar"
        showDepartment={false}
        showCycle={false}
        className="rounded-lg border bg-muted/10 p-3 xl:grid-cols-[minmax(12rem,1fr)_minmax(11rem,1.2fr)_repeat(3,minmax(8rem,1fr))]"
        onFiltersChange={handleFiltersChange}
        extraFilters={
          <MonthYearFilterFields
            month={month}
            year={year}
            onMonthChange={(value) => {
              setMonth(value);
              setPage(1);
            }}
            onYearChange={(value) => {
              setYear(value);
              setPage(1);
            }}
          />
        }
      />

      <PerformanceTableShell
        className="max-h-[min(36vh,320px)]"
        empty={
          <EmptyState
            title={records.length === 0 ? "No KPI assignments yet" : "No KPIs for this period"}
            description={
              records.length === 0
                ? "Pick a template above and assign it to an employee to start tracking."
                : "Try another month or year to see more assignments."
            }
            className="border-0 py-8"
          />
        }
      >
        {paged.rows.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-30 bg-black text-left shadow-[0_1px_0_rgba(255,255,255,0.08)]">
              <tr className="text-left text-muted-foreground">
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Employee</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Employee ID</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">KPI</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Target</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Current</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Status</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Due</th>
                <th className="h-11 whitespace-nowrap bg-black px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white" />
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-3 py-2.5">
                    <div className="font-medium">{row.employeeName}</div>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">{row.employeeCode}</td>
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {formatKpiTarget(row.targetValue, row.measurementType)}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {formatKpiProgress(row.currentValue, row.measurementType)}
                  </td>
                  <td className="px-3 py-2.5">
                    <KpiRowStatusBadge
                      kpiStatus={row.kpiStatus}
                      progressComments={row.progressComments}
                    />
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
          onSaved={(updated) => {
            onKpiRecordUpdated?.(updated);
          }}
        />
      ) : null}

      <KpiDetailModal
        record={viewing}
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
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

  const handleKpiRecordUpdated = useCallback((updated: KpiListItem) => {
    skipServerSyncRef.current = true;
    setRecords((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  }, []);

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
          employees={formProps.employees}
          onKpiRecordUpdated={handleKpiRecordUpdated}
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
  onSaved,
}: {
  record: KpiListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (record: KpiListItem) => void;
}) {
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

  useEffect(() => {
    form.reset({
      kpiId: record.id,
      currentValue: record.currentValue,
      progressComments: record.progressComments ?? "",
      evidenceNotes: record.evidenceNotes ?? "",
    });
  }, [record, form]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Update KPI Progress"
      description={`${record.employeeName} — ${record.title}`}
      contentClassName="sm:max-w-lg"
      showCancel={false}
      footer={
        <>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={form.handleSubmit((values) => {
              startTransition(async () => {
                const result = await updateKpiProgressAction(values);
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }

                const currentValue = Number(values.currentValue);
                const completion = calculateKpiCompletion(
                  currentValue,
                  record.targetValue,
                  record.measurementType,
                );
                const nextStatus = deriveKpiStatus(
                  completion,
                  record.endDate,
                  currentValue,
                  record.startDate,
                );
                const updated = applyKpiProgressToListItem(record, {
                  currentValue,
                  completionPercentage: completion,
                  progressComments: values.progressComments,
                  evidenceNotes: values.evidenceNotes,
                  kpiStatus: nextStatus,
                });

                toast.success("KPI progress updated");
                onOpenChange(false);
                onSaved?.(updated);
              });
            })}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Progress
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <p>
            Target: {formatKpiTarget(record.targetValue, record.measurementType)} · Weightage:{" "}
            {record.weightage}%
          </p>
        </div>
        <KpiProgressFields
          form={form}
          measurementType={record.measurementType}
          disabled={isPending}
          mode="hr"
        />
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
