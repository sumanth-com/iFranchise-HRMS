"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { FeedbackDetailModal } from "@/components/performance/feedback-detail-modal";
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
import { FeedbackTypeBadge } from "@/components/performance/performance-status-badge";
import {
  PerformanceTableShell,
  TableActions,
  ViewIconButton,
} from "@/components/performance/performance-ui-primitives";
import { FEEDBACK_TYPE_LABELS } from "@/lib/performance/constants";
import type { FeedbackListItem } from "@/types/performance";

const typeItems = buildStatusItems(FEEDBACK_TYPE_LABELS, "All types");

export function EmployeeFeedbackView({ feedback }: { feedback: FeedbackListItem[] }) {
  const [viewRecord, setViewRecord] = useState<FeedbackListItem | null>(null);
  const [search, setSearch] = useState("");
  const [feedbackType, setFeedbackType] = useState<string | undefined>();
  const [month, setMonth] = useState(currentMonthValue);
  const [year, setYear] = useState(currentYearValue);

  const filtered = useMemo(() => {
    return feedback.filter((row) => {
      if (feedbackType && row.feedbackType !== feedbackType) return false;
      if (!matchesAssignedPeriod(row.createdAt, month, year)) return false;
      return matchesTextQuery([row.fromEmployeeName, row.message], search);
    });
  }, [feedback, search, feedbackType, month, year]);

  function handleFiltersChange(updates: PerformanceFilterUpdates) {
    if ("search" in updates) setSearch(updates.search ?? "");
    if ("feedbackType" in updates) setFeedbackType(updates.feedbackType);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PerformanceFilters
        employees={[]}
        statusItems={typeItems}
        statusKey="feedbackType"
        statusValue={feedbackType}
        search={search}
        searchPlaceholder="Search feedback…"
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
            title={feedback.length === 0 ? "No feedback yet" : "No feedback for this period"}
            description={
              feedback.length === 0
                ? "Feedback shared with you will appear here in your profile area."
                : "Try another month or year to see more notes."
            }
            className="border-0 py-10"
          />
        }
      >
        {filtered.length > 0 ? (
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="sticky top-0 z-30 bg-blue-600 bg-gradient-to-r from-blue-600 to-violet-600 text-left text-white shadow-[0_1px_0_rgba(255,255,255,0.12)]">
              <tr className="text-left">
                <th className="min-w-[14rem] px-4 py-3 font-medium text-white">From</th>
                <th className="w-[9rem] px-4 py-3 font-medium text-white">Type</th>
                <th className="w-[40%] max-w-md px-4 py-3 font-medium text-white">Message</th>
                <th className="w-[7.5rem] px-4 py-3 font-medium text-white">Date</th>
                <th className="w-[5.5rem] px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t align-middle">
                  <td className="min-w-[14rem] px-4 py-3 align-middle leading-snug">
                    {row.fromEmployeeName}
                  </td>
                  <td className="w-[9rem] px-4 py-3 align-middle">
                    <FeedbackTypeBadge type={row.feedbackType} />
                  </td>
                  <td className="w-[40%] max-w-md px-4 py-3 align-middle">
                    <span className="line-clamp-2 text-muted-foreground">{row.message}</span>
                  </td>
                  <td className="w-[7.5rem] px-4 py-3 align-middle whitespace-nowrap text-xs">
                    {format(new Date(row.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="w-[5.5rem] px-4 py-3 align-middle">
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

      <FeedbackDetailModal
        record={viewRecord}
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
      />
    </div>
  );
}
