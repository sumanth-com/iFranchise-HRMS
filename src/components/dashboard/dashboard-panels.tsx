"use client";

import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  Cake,
  ClipboardList,
  FileWarning,
  Gift,
  Package,
  Palmtree,
  Sparkles,
  Target,
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

type DashboardVisualTone = "default" | "vibrant";

type CardTone = {
  iconWrap: string;
  count: string;
  countIdle: string;
  tile: string;
  link: string;
  glow: string;
};

const DEFAULT_CARD_TONE: CardTone = {
  iconWrap: "bg-primary/10 text-primary",
  count: "bg-primary/10 text-primary",
  countIdle: "bg-muted/70 text-muted-foreground",
  tile: "",
  link: "text-primary",
  glow: "",
};

const VIBRANT_CARD_TONE: CardTone = {
  iconWrap: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  count: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  countIdle: "bg-muted/60 text-muted-foreground",
  tile: "bg-white ring-1 ring-inset ring-violet-500/12 dark:bg-card",
  link: "text-violet-700 dark:text-violet-300",
  glow: "",
};

const VIBRANT_SECTION_CLASS = "bg-white ring-1 ring-inset ring-violet-500/10 dark:bg-card";
const VIBRANT_HEADING_CLASS = "bg-violet-500/12 text-violet-700 dark:text-violet-300";

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
  "team-attendance-report": BarChart3,
  "performance-team-reports": Target,
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
  "team-attendance-report": "Attendance trends and team presence reports",
  "performance-team-reports": "Goals, KPIs, and performance insights for your team",
};

function resolveCardTone(_id: string, visualTone: DashboardVisualTone): CardTone {
  if (visualTone !== "vibrant") return DEFAULT_CARD_TONE;
  return VIBRANT_CARD_TONE;
}

function FocusTaskCard({
  item,
  visualTone = "default",
}: {
  item: DashboardTaskItem;
  visualTone?: DashboardVisualTone;
}) {
  const Icon = TASK_ICONS[item.id] ?? ClipboardList;
  const hasWork = (item.count ?? 0) > 0;
  const hint = TASK_HINTS[item.id] ?? "Open the linked workflow to continue";
  const tone = resolveCardTone(item.id, visualTone);

  return (
    <Link
      href={item.href}
      className={cn(
        "relative flex h-full min-h-0 flex-col justify-between overflow-hidden",
        dashboardTileClass,
        tone.tile,
        visualTone === "vibrant" ? "p-4" : "",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone.iconWrap,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug text-foreground">{item.label}</p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="mt-4 flex shrink-0 items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-md px-2.5 py-1 text-base font-semibold tabular-nums leading-none",
            hasWork ? tone.count : tone.countIdle,
          )}
        >
          {item.count ?? 0}
        </span>
        <span className={cn("inline-flex shrink-0 items-center gap-1 text-[11px] font-medium", tone.link)}>
          Open
          <ArrowRight className="size-3.5" />
        </span>
      </div>
    </Link>
  );
}

function WatchFocusCard({
  item,
  visualTone = "default",
}: {
  item: DashboardWatchItem;
  visualTone?: DashboardVisualTone;
}) {
  return (
    <FocusTaskCard
      item={{
        id: item.id,
        label: item.label,
        count: item.value,
        href: item.href,
        urgency: item.value > 0 ? "medium" : "low",
      }}
      visualTone={visualTone}
    />
  );
}

function SectionHeading({
  title,
  description,
  icon: Icon,
  visualTone,
  toneClass,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  visualTone: DashboardVisualTone;
  toneClass: string;
}) {
  return (
    <div className="mb-3 flex shrink-0 items-center gap-2">
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-lg",
          visualTone === "vibrant" ? toneClass : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div>
        <h2 className="text-[11px] font-semibold tracking-wide text-foreground uppercase">
          {title}
        </h2>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function HrPriorityFocus({
  items,
  description = "Payroll, interviews, leave, and onboarding",
  visualTone = "default",
  maxItems = 4,
}: {
  items: DashboardTaskItem[];
  description?: string;
  visualTone?: DashboardVisualTone;
  maxItems?: number;
}) {
  const cards = items.slice(0, maxItems);
  if (cards.length === 0) return null;

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col",
        dashboardSectionClass,
        visualTone === "vibrant" && VIBRANT_SECTION_CLASS,
      )}
    >
      <SectionHeading
        title="Focus Today"
        description={description}
        icon={Sparkles}
        visualTone={visualTone}
        toneClass={VIBRANT_HEADING_CLASS}
      />

      <div
        className={cn(
          "grid flex-1 gap-3",
          cards.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2",
          visualTone === "vibrant"
            ? cards.length <= 2
              ? "auto-rows-[minmax(8.75rem,1fr)]"
              : "auto-rows-[minmax(8.75rem,1fr)]"
            : "min-h-0",
        )}
      >
        {cards.map((item) => (
          <FocusTaskCard key={item.id} item={item} visualTone={visualTone} />
        ))}
      </div>
    </section>
  );
}

function PeopleFocusPanel({
  items,
  title = "People Focus",
  description = "Workforce signals worth a quick look",
  visualTone = "default",
}: {
  items: DashboardWatchItem[];
  title?: string;
  description?: string;
  visualTone?: DashboardVisualTone;
}) {
  const cards = items.slice(0, 4);
  if (cards.length === 0) return null;

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col",
        dashboardSectionClass,
        visualTone === "vibrant" && VIBRANT_SECTION_CLASS,
      )}
    >
      <SectionHeading
        title={title}
        description={description}
        icon={Users}
        visualTone={visualTone}
        toneClass={VIBRANT_HEADING_CLASS}
      />

      <div
        className={cn(
          "grid flex-1 gap-3",
          cards.length <= 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4",
          visualTone === "vibrant" ? "auto-rows-[minmax(8.75rem,1fr)]" : "min-h-0",
        )}
      >
        {cards.map((item) => (
          <WatchFocusCard key={item.id} item={item} visualTone={visualTone} />
        ))}
      </div>
    </section>
  );
}

function ReportsFocusPanel({
  items,
  title = "Reports",
  description = "Team insights and operational reports",
  visualTone = "default",
}: {
  items: DashboardWatchItem[];
  title?: string;
  description?: string;
  visualTone?: DashboardVisualTone;
}) {
  const cards = items.slice(0, 2);
  if (cards.length === 0) return null;

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col",
        dashboardSectionClass,
        visualTone === "vibrant" && VIBRANT_SECTION_CLASS,
      )}
    >
      <SectionHeading
        title={title}
        description={description}
        icon={BarChart3}
        visualTone={visualTone}
        toneClass={VIBRANT_HEADING_CLASS}
      />

      <div
        className={cn(
          "grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2",
          visualTone === "vibrant" ? "auto-rows-[minmax(8.75rem,1fr)]" : "min-h-0",
        )}
      >
        {cards.map((item) => (
          <WatchFocusCard key={item.id} item={item} visualTone={visualTone} />
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
  visualTone = "default",
}: {
  items: DashboardWatchItem[];
  title?: string;
  description?: string;
  visualTone?: DashboardVisualTone;
}) {
  const cards = items.slice(0, 2);
  if (cards.length === 0) return null;

  return (
    <section
      className={cn(
        "flex h-full min-h-0 flex-col",
        dashboardSectionClass,
        visualTone === "vibrant" && VIBRANT_SECTION_CLASS,
      )}
    >
      <SectionHeading
        title={title}
        description={description}
        icon={Users}
        visualTone={visualTone}
        toneClass={VIBRANT_HEADING_CLASS}
      />

      <div
        className={cn(
          "grid flex-1 gap-3",
          visualTone === "vibrant"
            ? "grid-rows-[repeat(2,minmax(8.75rem,1fr))]"
            : "min-h-0 grid-rows-2",
        )}
      >
        {cards.map((item) => (
          <WatchFocusCard key={item.id} item={item} visualTone={visualTone} />
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
  focusItems,
  focusMaxItems = 4,
  rightPanel = "holidays",
  rightFocusItems,
  rightFocusTitle,
  rightFocusDescription,
  bottomSection = "insights",
  reportItems,
  reportsTitle,
  reportsDescription,
  visualTone = "default",
  layout = "default",
}: {
  tasks: DashboardTaskItem[];
  watchItems: DashboardWatchItem[];
  upcomingHolidays: DashboardListItem[];
  upcomingBirthdays: DashboardPersonEvent[];
  upcomingAnniversaries: DashboardPersonEvent[];
  insightsTitle?: string;
  insightsDescription?: string;
  focusDescription?: string;
  focusItems?: DashboardTaskItem[];
  focusMaxItems?: number;
  rightPanel?: "holidays" | "focus-pair" | "none";
  rightFocusItems?: DashboardWatchItem[];
  rightFocusTitle?: string;
  rightFocusDescription?: string;
  bottomSection?: "insights" | "reports" | "none";
  reportItems?: DashboardWatchItem[];
  reportsTitle?: string;
  reportsDescription?: string;
  visualTone?: DashboardVisualTone;
  layout?: "default" | "split";
}) {
  const priorityItems = focusItems ?? tasks;

  if (layout === "split") {
    return (
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[3fr_2fr] xl:items-stretch">
        <div className="flex min-h-0 flex-col gap-4">
          <HrPriorityFocus
            items={priorityItems}
            description={focusDescription}
            visualTone={visualTone}
            maxItems={focusMaxItems}
          />
          {bottomSection === "insights" ? (
            <PeopleFocusPanel
              items={watchItems}
              title={insightsTitle ?? "People Focus"}
              description={insightsDescription ?? "Workforce signals worth a quick look"}
              visualTone={visualTone}
            />
          ) : null}
          {bottomSection === "reports" ? (
            <ReportsFocusPanel
              items={reportItems ?? []}
              title={reportsTitle}
              description={reportsDescription}
              visualTone={visualTone}
            />
          ) : null}
        </div>
        <HrUpcomingHolidaysPanel
          holidays={upcomingHolidays}
          birthdays={upcomingBirthdays}
          anniversaries={upcomingAnniversaries}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        visualTone === "vibrant"
          ? "flex flex-col gap-4"
          : "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden",
      )}
    >
      <div
        className={cn(
          "grid gap-4 xl:items-stretch",
          rightPanel === "none" ? "grid-cols-1" : "xl:grid-cols-2",
          visualTone !== "vibrant" && "min-h-0 overflow-hidden",
        )}
      >
        <HrPriorityFocus
          items={priorityItems}
          description={focusDescription}
          visualTone={visualTone}
          maxItems={focusMaxItems}
        />
        {rightPanel === "focus-pair" ? (
          <FocusPairPanel
            items={rightFocusItems ?? []}
            title={rightFocusTitle}
            description={rightFocusDescription}
            visualTone={visualTone}
          />
        ) : rightPanel === "holidays" ? (
          <HrUpcomingHolidaysPanel
            holidays={upcomingHolidays}
            birthdays={upcomingBirthdays}
            anniversaries={upcomingAnniversaries}
          />
        ) : null}
      </div>

      {bottomSection === "insights" ? (
        <div className="min-h-0">
          <PeopleFocusPanel
            items={watchItems}
            title={insightsTitle ?? "People Focus"}
            description={insightsDescription ?? "Workforce signals worth a quick look"}
            visualTone={visualTone}
          />
        </div>
      ) : null}
      {bottomSection === "reports" ? (
        <div className="min-h-0">
          <ReportsFocusPanel
            items={reportItems ?? []}
            title={reportsTitle}
            description={reportsDescription}
            visualTone={visualTone}
          />
        </div>
      ) : null}
    </div>
  );
}
