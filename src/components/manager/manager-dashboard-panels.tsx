"use client";

import { formatDistanceToNow, parseISO } from "date-fns";
import {
  ArrowRight,
  BriefcaseBusiness,
  Cake,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Loader2,
  MessageSquare,
  Radio,
  Sparkles,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { fetchManagerDashboardActivitiesAction } from "@/lib/manager/actions/manager-dashboard-actions";
import {
  filterActionItems,
  filterActivities,
  focusModuleHref,
  MANAGER_DASHBOARD_FOCUS_FILTERS,
  type ManagerDashboardFocus,
} from "@/lib/manager/dashboard-focus";
import type {
  ManagerActionItem,
  ManagerActionKind,
  ManagerActivityItem,
  ManagerActivityKind,
} from "@/types/manager-dashboard";
import { cn } from "@/lib/utils";

const ACTION_ICONS: Record<ManagerActionKind, LucideIcon> = {
  leave_approval: ClipboardCheck,
  attendance_correction: CalendarClock,
  performance_review: ClipboardList,
  interview: BriefcaseBusiness,
  probation: Sparkles,
  birthday: Cake,
};

const ACTIVITY_ICONS: Record<ManagerActivityKind, LucideIcon> = {
  leave_applied: ClipboardList,
  attendance_regularized: CalendarClock,
  feedback_submitted: MessageSquare,
  employee_joined: UserPlus,
  promotion_recommendation: TrendingUp,
  interview_completed: BriefcaseBusiness,
};

const LIVE_POLL_MS = 30_000;
const TIME_REFRESH_MS = 60_000;

function urgencyClass(urgency: ManagerActionItem["urgency"]) {
  switch (urgency) {
    case "high":
      return "border-l-orange-500";
    case "medium":
      return "border-l-primary";
    default:
      return "border-l-muted-foreground/30";
  }
}

function ManagerPrioritiesPanel({
  actionItems,
  focusFilter,
  selectedEmployeeId,
}: {
  actionItems: ManagerActionItem[];
  focusFilter: ManagerDashboardFocus;
  selectedEmployeeId: string | null;
}) {
  const filteredItems = useMemo(
    () => filterActionItems(actionItems, focusFilter, selectedEmployeeId),
    [actionItems, focusFilter, selectedEmployeeId],
  );

  const moduleHref = focusModuleHref(focusFilter, selectedEmployeeId);
  const focusLabel =
    MANAGER_DASHBOARD_FOCUS_FILTERS.find((item) => item.id === focusFilter)?.label ?? "All";

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">Today&apos;s Priorities</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {focusFilter === "all"
              ? "Actionable items from your reporting hierarchy."
              : `${focusLabel} items requiring your attention.`}
          </p>
        </div>
        {moduleHref && filteredItems.length > 0 ? (
          <Link
            href={moduleHref}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Open module
            <ArrowRight className="size-3" />
          </Link>
        ) : null}
      </div>

      {filteredItems.length === 0 ? (
        <EmptyState
          title="All caught up"
          description={
            focusFilter === "all"
              ? "No pending approvals or reviews waiting on you right now."
              : `No ${focusLabel.toLowerCase()} items match your current filters.`
          }
          className="flex-1 border-0 bg-transparent p-2 shadow-none"
        />
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
          {filteredItems.map((item) => {
            const Icon = ACTION_ICONS[item.kind];
            const content = (
              <>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40">
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.subtitle} · {item.meta}
                  </p>
                </div>
                {item.href ? (
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                ) : null}
              </>
            );

            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border border-l-[3px] bg-background/80 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/[0.03]",
                      urgencyClass(item.urgency),
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border border-l-[3px] bg-background/80 px-3 py-2.5",
                      urgencyClass(item.urgency),
                    )}
                  >
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ActivityRow({
  item,
  isNew,
}: {
  item: ManagerActivityItem;
  isNew: boolean;
}) {
  const Icon = ACTIVITY_ICONS[item.kind];

  return (
    <li
      className={cn(
        "transition-colors duration-700",
        isNew && "rounded-lg bg-primary/5 ring-1 ring-primary/15",
      )}
    >
      <div className="flex items-start gap-2.5 py-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <Icon className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <time className="shrink-0 text-[10px] text-muted-foreground" suppressHydrationWarning>
              {formatDistanceToNow(parseISO(item.occurredAt), { addSuffix: true })}
            </time>
          </div>
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        </div>
      </div>
    </li>
  );
}

function ManagerLiveActivityFeed({
  initialActivities,
  focusFilter,
  selectedEmployeeId,
}: {
  initialActivities: ManagerActivityItem[];
  focusFilter: ManagerDashboardFocus;
  selectedEmployeeId: string | null;
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [, setTimeTick] = useState(0);
  const [isRefreshing, startRefresh] = useTransition();

  const filteredActivities = useMemo(
    () => filterActivities(activities, focusFilter, selectedEmployeeId),
    [activities, focusFilter, selectedEmployeeId],
  );

  useEffect(() => {
    setActivities(initialActivities);
  }, [initialActivities]);

  useEffect(() => {
    function refresh() {
      startRefresh(async () => {
        const result = await fetchManagerDashboardActivitiesAction(
          selectedEmployeeId ?? undefined,
        );
        setActivities((previous) => {
          const previousIds = new Set(previous.map((item) => item.id));
          const incomingNew = result.activities
            .filter((item) => !previousIds.has(item.id))
            .map((item) => item.id);
          if (incomingNew.length) {
            setNewIds(new Set(incomingNew));
            window.setTimeout(() => setNewIds(new Set()), 4_000);
          }
          return result.activities;
        });
        setLastUpdated(new Date(result.generatedAt));
      });
    }

    refresh();
    const pollId = window.setInterval(refresh, LIVE_POLL_MS);
    return () => window.clearInterval(pollId);
  }, [selectedEmployeeId]);

  useEffect(() => {
    const tickId = window.setInterval(() => setTimeTick((value) => value + 1), TIME_REFRESH_MS);
    return () => window.clearInterval(tickId);
  }, []);

  const focusLabel =
    MANAGER_DASHBOARD_FOCUS_FILTERS.find((item) => item.id === focusFilter)?.label ?? "All";

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight">Recent Team Activity</h2>
            <span className="inline-flex items-center gap-1 rounded-full border bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              <Radio className="size-2.5 animate-pulse" />
              Live
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {focusFilter !== "all"
              ? `${focusLabel} activity · auto-refreshes every 30 seconds.`
              : "Auto-refreshes every 30 seconds from your reporting hierarchy."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">
          {isRefreshing ? <Loader2 className="size-3 animate-spin" /> : null}
          <span suppressHydrationWarning>
            Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}
          </span>
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <EmptyState
          title="No recent team activity"
          description={
            focusFilter === "all"
              ? "Leave, attendance, feedback, and hiring events from your team will show up here."
              : `No ${focusLabel.toLowerCase()} activity matches your current filters.`
          }
          className="flex-1 border-0 bg-transparent p-2 shadow-none"
        />
      ) : (
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto pr-0.5">
          {filteredActivities.slice(0, 12).map((item) => (
            <ActivityRow key={item.id} item={item} isNew={newIds.has(item.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}

type ManagerDashboardPanelsProps = {
  actionItems: ManagerActionItem[];
  activities: ManagerActivityItem[];
  focusFilter: ManagerDashboardFocus;
  selectedEmployeeId: string | null;
};

export function ManagerDashboardPanels({
  actionItems,
  activities,
  focusFilter,
  selectedEmployeeId,
}: ManagerDashboardPanelsProps) {
  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2 lg:items-stretch">
      <ManagerPrioritiesPanel
        actionItems={actionItems}
        focusFilter={focusFilter}
        selectedEmployeeId={selectedEmployeeId}
      />
      <ManagerLiveActivityFeed
        initialActivities={activities}
        focusFilter={focusFilter}
        selectedEmployeeId={selectedEmployeeId}
      />
    </div>
  );
}
