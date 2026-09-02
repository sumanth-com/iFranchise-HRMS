"use client";

import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LabeledSelect } from "@/components/payroll/payroll-select";
import { RecruitmentPipelinePanel } from "@/components/recruitment/recruitment-pipeline-panel";
import { RECRUITMENT_ROUTES } from "@/lib/recruitment/constants";
import { getHrmsYearSelectItems } from "@/lib/date/hrms-year";
import { cn } from "@/lib/utils";
import type { AnalyticsSummary } from "@/types/recruitment";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => {
  const value = String(index + 1);
  const label = format(new Date(2024, index, 1), "MMMM");
  return { value, label };
});

function buildYearOptions(_selectedYear: number) {
  return getHrmsYearSelectItems();
}

export function HiringAnalyticsPanels({
  analytics,
  month,
  year,
}: {
  analytics: AnalyticsSummary;
  month: number;
  year: number;
}) {
  const router = useRouter();
  const periodLabel = format(new Date(year, month - 1, 1), "MMMM yyyy");
  const yearOptions = buildYearOptions(year);

  function updatePeriod(nextMonth: number, nextYear: number) {
    const params = new URLSearchParams();
    params.set("month", String(nextMonth));
    params.set("year", String(nextYear));
    router.push(`${RECRUITMENT_ROUTES.analytics}?${params.toString()}`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Hiring Insights</h1>
          <p className="text-xs text-muted-foreground">
            Application funnel and hiring outcomes for {periodLabel}.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LabeledSelect
            items={MONTH_OPTIONS}
            value={String(month)}
            onValueChange={(value) => updatePeriod(Number(value), year)}
            placeholder="Month"
            triggerClassName="h-8 w-[8.5rem]"
          />
          <LabeledSelect
            items={yearOptions}
            value={String(year)}
            onValueChange={(value) => updatePeriod(month, Number(value))}
            placeholder="Year"
            triggerClassName="h-8 w-[5.5rem]"
          />
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-stretch">
        <section className="flex min-h-[240px] flex-col rounded-xl border bg-card p-3 shadow-sm">
          <RecruitmentPipelinePanel
            stages={analytics.pipeline}
            title="Application funnel"
            subtitle={`Applicants from ${periodLabel} by current stage`}
          />
        </section>

        <section className="flex flex-col rounded-xl border bg-card p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-foreground">Hiring outcomes</p>
              <p className="text-[11px] text-muted-foreground">Rates and activity for {periodLabel}</p>
            </div>
            <Link
              href={RECRUITMENT_ROUTES.offers}
              className="text-[11px] font-medium text-primary hover:underline"
            >
              View offers
            </Link>
          </div>

          <div className="space-y-2">
            <OutcomeRow label="Applications" value={analytics.totalApplications} />
            <OutcomeRow
              label="Selected / hired"
              value={analytics.selectedHired}
              valueClassName="text-emerald-600"
            />
            <OutcomeRow
              label="Rejected"
              value={analytics.rejected}
              valueClassName="text-red-600"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
            <RateChip label="Hiring rate" value={`${analytics.hiringRate}%`} />
            <RateChip label="Selection rate" value={`${analytics.selectionRate}%`} />
            <RateChip label="Avg time to hire" value={`${analytics.averageTimeToHireDays}d`} />
            <RateChip label="Open jobs" value={String(analytics.openJobCount)} />
          </div>

          <div className="mt-3 rounded-lg border bg-muted/20 px-3 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {periodLabel}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">New applications</span>
              <span className="text-right font-semibold tabular-nums">
                {analytics.applicationsThisMonth}
              </span>
              <span className="text-muted-foreground">Hired</span>
              <span className="text-right font-semibold tabular-nums text-emerald-600">
                {analytics.hiresThisMonth}
              </span>
              <span className="text-muted-foreground">Rejected</span>
              <span className="text-right font-semibold tabular-nums text-red-600">
                {analytics.rejectedThisMonth}
              </span>
              <span className="text-muted-foreground">Offers sent</span>
              <span className="text-right font-semibold tabular-nums">{analytics.offersSent}</span>
              <span className="text-muted-foreground">Offers accepted</span>
              <span className="text-right font-semibold tabular-nums text-primary">
                {analytics.offersAccepted} ({analytics.offerAcceptanceRate}%)
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function OutcomeRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/15 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-semibold tabular-nums", valueClassName)}>{value}</span>
    </div>
  );
}

function RateChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/15 px-2.5 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
