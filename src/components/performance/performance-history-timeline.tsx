"use client";

import { format } from "date-fns";
import {
  Award,
  Banknote,
  MessageSquare,
  Star,
  Target,
  TrendingUp,
} from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import {
  buildStatusItems,
  PerformanceFilters,
  PerformancePagination,
} from "@/components/performance/performance-filters";
import type { HistoryEvent, HistoryEventType } from "@/types/performance";
import type { LookupOption } from "@/types/employee";

const EVENT_TYPE_LABELS: Record<HistoryEventType, string> = {
  review: "Review",
  promotion: "Promotion",
  feedback: "Feedback",
  goal: "Goal",
  salary_revision: "Salary Revision",
  bonus: "Award / Bonus",
};

const EVENT_ICONS: Record<HistoryEventType, typeof Star> = {
  review: Star,
  promotion: TrendingUp,
  feedback: MessageSquare,
  goal: Target,
  salary_revision: Banknote,
  bonus: Award,
};

const eventTypeItems = buildStatusItems(EVENT_TYPE_LABELS, "All events");

export function PerformanceHistoryTimeline({
  records,
  total,
  page,
  pageSize,
  employees,
  employeeId,
  eventType,
}: {
  records: HistoryEvent[];
  total: number;
  page: number;
  pageSize: number;
  employees: LookupOption[];
  employeeId?: string;
  eventType?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <PerformanceFilters
          employees={employees}
          statusItems={eventTypeItems}
          statusKey="eventType"
          statusValue={eventType}
          employeeId={employeeId}
          searchPlaceholder="Filter by employee..."
        />
      </div>

      {records.length === 0 ? (
        <EmptyState
          title="No history events"
          description="Performance reviews, promotions, feedback, and awards will appear here."
          className="rounded-xl border bg-card"
        />
      ) : (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="relative space-y-0">
            {records.map((event, index) => {
              const Icon = EVENT_ICONS[event.eventType];
              return (
                <div key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
                  {index < records.length - 1 ? (
                    <div className="absolute left-5 top-10 h-full w-px bg-border" />
                  ) : null}
                  <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-card">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {EVENT_TYPE_LABELS[event.eventType]}
                        </p>
                        <h3 className="mt-1 font-medium">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">{event.employeeName}</p>
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {format(new Date(event.occurredAt), "MMM d, yyyy")}
                      </time>
                    </div>
                    {event.description ? (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PerformancePagination page={page} pageSize={pageSize} total={total} />
    </section>
  );
}
