"use client";

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { KpiDetailModal } from "@/components/performance/kpi-detail-modal";
import {
  buildStatusItems,
  currentMonthValue,
  currentYearValue,
  matchesAssignedPeriod,
  matchesTextQuery,
  MonthYearFilterFields,
  PerformanceFilters,
  type PerformanceFilterUpdates,
} from "@/components/performance/performance-filters";
import { KpiRowStatusBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
  UpdatePositionIconButton,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import { KPI_STATUS_LABELS } from "@/lib/performance/constants";
import { formatKpiProgress, formatKpiTarget } from "@/lib/performance/services/performance-utils";
import type { KpiListItem } from "@/types/performance";

const statusItems = buildStatusItems(KPI_STATUS_LABELS);

export function EmployeeKpisView({ kpis }: { kpis: KpiListItem[] }) {
  const [rows, setRows] = useState(kpis);
  const [viewing, setViewing] = useState<KpiListItem | null>(null);
  const [dialogMode, setDialogMode] = useState<"view" | "update">("view");
  const [search, setSearch] = useState("");
  const [kpiStatus, setKpiStatus] = useState<string | undefined>();
  const [month, setMonth] = useState(currentMonthValue);
  const [year, setYear] = useState(currentYearValue);

  useEffect(() => {
    setRows(kpis);
  }, [kpis]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (kpiStatus && row.kpiStatus !== kpiStatus) return false;
      if (!matchesAssignedPeriod(row.createdAt ?? row.startDate, month, year)) return false;
      return matchesTextQuery([row.title, row.departmentName], search);
    });
  }, [rows, search, kpiStatus, month, year]);

  function handleFiltersChange(updates: PerformanceFilterUpdates) {
    if ("search" in updates) setSearch(updates.search ?? "");
    if ("kpiStatus" in updates) setKpiStatus(updates.kpiStatus);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PerformanceFilters
        employees={[]}
        statusItems={statusItems}
        statusKey="kpiStatus"
        statusValue={kpiStatus}
        search={search}
        searchPlaceholder="Search your KPIs…"
        variant="bar"
        showEmployee={false}
        showDepartment={false}
        showCycle={false}
        className="shrink-0 rounded-lg border bg-muted/10 p-3 xl:grid-cols-[minmax(14rem,1.3fr)_repeat(3,minmax(8.5rem,1fr))]"
        onFiltersChange={handleFiltersChange}
        extraFilters={
          <MonthYearFilterFields
            month={month}
            year={year}
            onMonthChange={setMonth}
            onYearChange={setYear}
          />
        }
      />

      <PerformanceTableShell
        fill
        empty={
          <EmptyState
            title={rows.length === 0 ? "No KPIs assigned yet" : "No KPIs for this period"}
            description={
              rows.length === 0
                ? "When HR assigns a KPI to you, it will appear here."
                : "Try another month or year to see more KPIs."
            }
            className="border-0 py-10"
          />
        }
      >
        {filtered.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">KPI</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Current</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatKpiTarget(row.targetValue, row.measurementType)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatKpiProgress(row.currentValue, row.measurementType)}
                  </td>
                  <td className="px-4 py-3">
                    <KpiRowStatusBadge
                      kpiStatus={row.kpiStatus}
                      progressComments={row.progressComments}
                    />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {row.endDate ? format(new Date(row.endDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <ViewIconButton
                        onClick={() => {
                          setDialogMode("view");
                          setViewing(row);
                        }}
                      />
                      {row.kpiStatus !== "completed" ? (
                        <UpdatePositionIconButton
                          onClick={() => {
                            setDialogMode("update");
                            setViewing(row);
                          }}
                        />
                      ) : null}
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </PerformanceTableShell>

      <KpiDetailModal
        record={viewing}
        open={!!viewing}
        variant="employee"
        employeeDialogMode={dialogMode}
        onOpenChange={(open) => {
          if (!open) {
            setViewing(null);
            setDialogMode("view");
          }
        }}
        onUpdated={(updated) => {
          setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
        }}
      />
    </div>
  );
}
