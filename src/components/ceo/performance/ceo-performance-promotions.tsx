"use client";

import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  CeoChartPanel,
  CeoStatCard,
} from "@/components/ceo/ceo-module-primitives";
import { Button } from "@/components/common/button";
import { PromotionStatusBadge } from "@/components/performance/performance-status-badge";
import { approveCeoPromotionAction } from "@/lib/ceo/actions/ceo-performance-actions";
import { PROMOTION_STATUS_LABELS } from "@/lib/performance/constants";
import { formatCurrency } from "@/lib/payroll/services/payroll-utils";
import type { CeoPerformancePromotionOverview } from "@/types/ceo-performance";
import type { PromotionStatus } from "@/types/performance";

export function CeoPerformancePromotions({
  promotions,
  onChanged,
}: {
  promotions: CeoPerformancePromotionOverview;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pipeline = promotions.pipeline.map((item) => ({
    label:
      PROMOTION_STATUS_LABELS[item.label as PromotionStatus] ?? item.label,
    value: item.value,
  }));

  function handleApprove(promotionId: string) {
    startTransition(async () => {
      const result = await approveCeoPromotionAction({ promotionId });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Promotion approved — salary will update in payroll");
      onChanged?.();
      router.refresh();
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Promotion Overview</h2>
        <p className="text-xs text-muted-foreground">
          Review pending promotions. Payroll updates only after you approve here.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <CeoStatCard
          label="Promotion Recommendations"
          value={String(promotions.recommendations)}
        />
        <CeoStatCard
          label="Approved Promotions"
          value={String(promotions.approved)}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <CeoStatCard
          label="Pending Promotions"
          value={String(promotions.pending)}
          accent="text-amber-600 dark:text-amber-400"
        />
        <CeoStatCard
          label="Rejected Promotions"
          value={String(promotions.rejected)}
          accent={promotions.rejected > 0 ? "text-destructive" : undefined}
        />
      </div>

      {promotions.pendingQueue.length > 0 ? (
        <div className="rounded-xl border bg-card shadow-sm">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-medium">Pending approvals</h3>
            <p className="text-xs text-muted-foreground">
              Approve to apply role and salary changes to payroll.
            </p>
          </div>
          <div className="divide-y">
            {promotions.pendingQueue.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{item.employeeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.currentDesignation ?? "Current role"} →{" "}
                    {item.recommendedDesignation ?? "Proposed role"}
                    {item.departmentName ? ` · ${item.departmentName}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.currentSalary != null && item.recommendedSalary != null
                      ? `${formatCurrency(item.currentSalary)} → ${formatCurrency(
                          item.recommendedSalary,
                        )}`
                      : item.recommendedSalary != null
                        ? formatCurrency(item.recommendedSalary)
                        : "—"}
                    {" · "}
                    {format(new Date(item.createdAt), "d MMM yyyy")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PromotionStatusBadge status={item.promotionStatus} />
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleApprove(item.id)}
                  >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <CeoChartPanel
        title="Promotion Pipeline"
        items={pipeline}
        color="bg-violet-500"
      />
    </section>
  );
}
