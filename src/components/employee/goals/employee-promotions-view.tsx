"use client";

import { format } from "date-fns";
import { useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PromotionDetailModal } from "@/components/performance/promotion-detail-modal";
import { PromotionStatusBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import type { PromotionListItem } from "@/types/performance";

export function EmployeePromotionsView({ promotions }: { promotions: PromotionListItem[] }) {
  const [viewRecord, setViewRecord] = useState<PromotionListItem | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <PerformanceTableShell
        className="max-h-[min(50vh,420px)]"
        empty={
          <EmptyState
            title="No promotion updates"
            description="When HR recommends or approves a promotion for you, it will appear here."
            className="border-0 py-10"
          />
        }
      >
        {promotions.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card shadow-[0_1px_0_hsl(var(--border))]">
              <tr className="text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Current role</th>
                <th className="px-4 py-3 font-medium">Recommended role</th>
                <th className="px-4 py-3 font-medium">Salary change</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Recommended by</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {promotions.map((row) => (
                <tr key={row.id} className="border-t align-middle">
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
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {format(new Date(row.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <TableActions>
                      <ViewIconButton onClick={() => setViewRecord(row)} />
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </PerformanceTableShell>

      <PromotionDetailModal
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
      />
    </div>
  );
}
