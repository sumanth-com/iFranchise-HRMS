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
    <div className="flex min-h-0 flex-1 flex-col">
      <PerformanceTableShell
        fill
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
            <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
              <tr className="text-left">
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Current role</th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Recommended role</th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Salary change</th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Status</th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Recommended by</th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle text-xs font-semibold uppercase tracking-wide text-white">Submitted</th>
                <th className="h-11 whitespace-nowrap bg-transparent px-4 py-3 align-middle" />
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
