"use client";

import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Cake,
  ClipboardList,
  FileWarning,
  Gift,
  Package,
  Palmtree,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import {
  dashboardSectionClass,
  dashboardTileClass,
} from "@/components/dashboard/dashboard-surface-classes";
import { HrUpcomingHolidaysPanel } from "@/components/dashboard/hr-today-pulse-section";
import type {
  DashboardListItem,
  DashboardPersonEvent,
  DashboardTaskItem,
  DashboardWatchItem,
} from "@/types/dashboard";
import { cn } from "@/lib/utils";

const TASK_ICONS: Record<string, LucideIcon> = {
  "onboarding-review": UserPlus,
  "documents-expiring": FileWarning,
  "active-candidates": BriefcaseBusiness,
  "payroll-due": Wallet,
  "interviews-today": CalendarClock,
  "on-leave": Palmtree,
  "probation-ending": UserPlus,
  "upcoming-birthdays": Cake,
  "work-anniversaries": Gift,
  "company-assets": Package,
  "leave-approvals": Palmtree,
  "offers-pending": BriefcaseBusiness,
  headcount: Users,
  "team-size": Users,
  "exit-clearance": ClipboardList,
  "assets-return": ClipboardList,
  "pending-leave": Palmtree,
  "performance-reviews": ClipboardList,
};

const TASK_HINTS: Record<string, string> = {
  "onboarding-review": "Candidates ready for onboarding invitation",
  "documents-expiring": "Renew or verify employee documents before they lapse",
  "payroll-due": "Process this month's payroll run for your team",
  "active-candidates": "Follow up on candidates still in the hiring pipeline",
  "interviews-today": "Interviews scheduled for today",
  "on-leave": "Employees on approved leave today",
  headcount: "Current active workforce headcount",
  "team-size": "People in your reporting team",
  "probation-ending": "Review status before probation ends",
  "upcoming-birthdays": "Employee birthdays in the next 7 days",
  "work-anniversaries": "Work anniversaries in the next 30 days",
  "company-assets": "Company assets currently assigned to employees",
  "exit-clearance": "Exit clearances waiting on action",
  "assets-return": "Assets still pending return",
  "pending-leave": "Leave requests waiting for your decision",
  "performance-reviews": "Performance reviews still open for your team",
};

function FocusTaskCard({ item }: { item: DashboardTaskItem }) {
  const Icon = TASK_ICONS[item.id] ?? ClipboardList;
  const hasWork = (item.count ?? 0) > 0;
  const hint = TASK_HINTS[item.id] ?? "Open the linked workflow to continue";

  return (
    <Link
      href={item.href}
      className={cn("flex min-h-0 flex-col justify-between", dashboardTileClass)}
    >
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">{item.label}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span
          className={cn(
            "rounded-md px-2.5 py-0.5 text-base font-semibold tabular-nums leading-none",
            hasWork ? "bg-primary/10 text-primary" : "bg-muted/70 text-muted-foreground",
          )}
        >
          {item.count ?? 0}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
          Open
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function WatchFocusCard({ item }: { item: DashboardWatchItem }) {
  return (
    <FocusTaskCard
      item={{
        id: item.id,
        label: item.label,
        count: item.value,
        href: item.href,
        urgency: item.value > 0 ? "medium" : "low",
      }}
    />
  );
}

function HrPriorityFocus({
  items,
  description = "Payroll, interviews, leave, and onboarding",
}: {
  items: DashboardTaskItem[];
  description?: string;
}) {
  const cards = items.slice(0, 4);
  if (cards.length === 0) return null;

  return (
    <section className={cn("flex h-full min-h-0 flex-col", dashboardSectionClass)}>
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="size-3.5" />
        </span>
        <div>
          <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
            Focus Today
          </h2>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5">
        {cards.map((item) => (
          <FocusTaskCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function PeopleFocusPanel({
  items,
  title = "People Focus",
  description = "Workforce signals worth a quick look",
}: {
  items: DashboardWatchItem[];
  title?: string;
  description?: string;
}) {
  const cards = items.slice(0, 4);
  if (cards.length === 0) return null;

  return (
    <section className={cn("flex h-full min-h-0 flex-col overflow-hidden", dashboardSectionClass)}>
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="size-3.5" />
        </span>
        <div>
          <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
            {title}
          </h2>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-2.5",
          cards.length <= 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4",
        )}
      >
        {cards.map((item) => (
          <WatchFocusCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

/** Two stacked Focus-style cards — clean replacement for a wide right-side panel. */
function FocusPairPanel({
  items,
  title = "Workforce",
  description = "People counts to keep an eye on",
}: {
  items: DashboardWatchItem[];
  title?: string;
  description?: string;
}) {
  const cards = items.slice(0, 2);
  if (cards.length === 0) return null;

  return (
    <section className={cn("flex h-full min-h-0 flex-col overflow-hidden", dashboardSectionClass)}>
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="size-3.5" />
        </span>
        <div>
          <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
            {title}
          </h2>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-2.5">
        {cards.map((item) => (
          <WatchFocusCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export function DashboardOperationsRow({
  tasks,
  watchItems,
  upcomingHolidays,
  upcomingBirthdays,
  upcomingAnniversaries,
  insightsTitle,
  insightsDescription,
  focusDescription,
  rightPanel = "holidays",
  rightFocusItems,
  rightFocusTitle,
  rightFocusDescription,
}: {
  tasks: DashboardTaskItem[];
  watchItems: DashboardWatchItem[];
  upcomingHolidays: DashboardListItem[];
  upcomingBirthdays: DashboardPersonEvent[];
  upcomingAnniversaries: DashboardPersonEvent[];
  insightsTitle?: string;
  insightsDescription?: string;
  focusDescription?: string;
  rightPanel?: "holidays" | "focus-pair";
  rightFocusItems?: DashboardWatchItem[];
  rightFocusTitle?: string;
  rightFocusDescription?: string;
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="grid min-h-0 gap-3 overflow-hidden xl:grid-cols-2 xl:items-stretch">
        <HrPriorityFocus items={tasks} description={focusDescription} />
        {rightPanel === "focus-pair" ? (
          <FocusPairPanel
            items={rightFocusItems ?? []}
            title={rightFocusTitle}
            description={rightFocusDescription}
          />
        ) : (
          <HrUpcomingHolidaysPanel
            holidays={upcomingHolidays}
            birthdays={upcomingBirthdays}
            anniversaries={upcomingAnniversaries}
          />
        )}
      </div>

      <div className="min-h-0 overflow-hidden">
        <PeopleFocusPanel
          items={watchItems}
          title={insightsTitle ?? "People Focus"}
          description={insightsDescription ?? "Workforce signals worth a quick look"}
        />
      </div>
    </div>
  );
}
