"use client";

import { format } from "date-fns";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { KpiDetailModal } from "@/components/performance/kpi-detail-modal";
import { KpiStatusBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import { formatKpiTarget } from "@/lib/performance/services/performance-utils";
import type { KpiListItem } from "@/types/performance";

export function EmployeeKpisView({ kpis }: { kpis: KpiListItem[] }) {
  const [viewing, setViewing] = useState<KpiListItem | null>(null);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PerformanceTableShell
        fill
        empty={
          <EmptyState
            title="No KPIs assigned yet"
            description="When HR assigns a KPI to you, it will appear here."
            className="border-0 py-10"
          />
        }
      >
        {kpis.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">KPI</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {kpis.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatKpiTarget(row.targetValue, row.measurementType)}
                  </td>
                  <td className="px-4 py-3">
                    <KpiStatusBadge status={row.kpiStatus} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {row.endDate ? format(new Date(row.endDate), "MMM d, yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <ViewIconButton onClick={() => setViewing(row)} />
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
        onOpenChange={(open) => !open && setViewing(null)}
      />
    </div>
  );
}
