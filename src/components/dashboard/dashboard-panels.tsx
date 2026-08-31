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

const TASK_CARD_TONES: Record<string, CardTone> = {
  "payroll-due": {
    iconWrap: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    count: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    countIdle: "bg-emerald-500/8 text-emerald-700/70 dark:text-emerald-300/70",
    tile: "bg-gradient-to-br from-emerald-500/12 via-card to-teal-500/8 ring-1 ring-inset ring-emerald-500/12",
    link: "text-emerald-700 dark:text-emerald-300",
    glow: "bg-emerald-400/20",
  },
  "interviews-today": {
    iconWrap: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    count: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    countIdle: "bg-sky-500/8 text-sky-700/70 dark:text-sky-300/70",
    tile: "bg-gradient-to-br from-sky-500/12 via-card to-cyan-500/8 ring-1 ring-inset ring-sky-500/12",
    link: "text-sky-700 dark:text-sky-300",
    glow: "bg-sky-400/20",
  },
  "on-leave": {
    iconWrap: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    count: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    countIdle: "bg-amber-500/8 text-amber-800/70 dark:text-amber-300/70",
    tile: "bg-gradient-to-br from-amber-500/12 via-card to-orange-500/8 ring-1 ring-inset ring-amber-500/12",
    link: "text-amber-800 dark:text-amber-300",
    glow: "bg-amber-400/20",
  },
  "onboarding-review": {
    iconWrap: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    count: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    countIdle: "bg-violet-500/8 text-violet-700/70 dark:text-violet-300/70",
    tile: "bg-gradient-to-br from-violet-500/12 via-card to-fuchsia-500/8 ring-1 ring-inset ring-violet-500/12",
    link: "text-violet-700 dark:text-violet-300",
    glow: "bg-violet-400/20",
  },
  headcount: {
    iconWrap: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    count: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    countIdle: "bg-indigo-500/8 text-indigo-700/70 dark:text-indigo-300/70",
    tile: "bg-gradient-to-br from-indigo-500/12 via-card to-blue-500/8 ring-1 ring-inset ring-indigo-500/12",
    link: "text-indigo-700 dark:text-indigo-300",
    glow: "bg-indigo-400/20",
  },
  "team-size": {
    iconWrap: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    count: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    countIdle: "bg-indigo-500/8 text-indigo-700/70 dark:text-indigo-300/70",
    tile: "bg-gradient-to-br from-indigo-500/12 via-card to-blue-500/8 ring-1 ring-inset ring-indigo-500/12",
    link: "text-indigo-700 dark:text-indigo-300",
    glow: "bg-indigo-400/20",
  },
  "upcoming-birthdays": {
    iconWrap: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    count: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    countIdle: "bg-rose-500/8 text-rose-700/70 dark:text-rose-300/70",
    tile: "bg-gradient-to-br from-rose-500/12 via-card to-pink-500/8 ring-1 ring-inset ring-rose-500/12",
    link: "text-rose-700 dark:text-rose-300",
    glow: "bg-rose-400/20",
  },
  "company-assets": {
    iconWrap: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    count: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
    countIdle: "bg-cyan-500/8 text-cyan-700/70 dark:text-cyan-300/70",
    tile: "bg-gradient-to-br from-cyan-500/12 via-card to-teal-500/8 ring-1 ring-inset ring-cyan-500/12",
    link: "text-cyan-700 dark:text-cyan-300",
    glow: "bg-cyan-400/20",
  },
  "exit-clearance": {
    iconWrap: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
    count: "bg-orange-500/15 text-orange-800 dark:text-orange-300",
    countIdle: "bg-orange-500/8 text-orange-800/70 dark:text-orange-300/70",
    tile: "bg-gradient-to-br from-orange-500/12 via-card to-amber-500/8 ring-1 ring-inset ring-orange-500/12",
    link: "text-orange-800 dark:text-orange-300",
    glow: "bg-orange-400/20",
  },
  "probation-ending": {
    iconWrap: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    count: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    countIdle: "bg-amber-500/8 text-amber-800/70 dark:text-amber-300/70",
    tile: "bg-gradient-to-br from-amber-500/12 via-card to-yellow-500/8 ring-1 ring-inset ring-amber-500/12",
    link: "text-amber-800 dark:text-amber-300",
    glow: "bg-amber-400/20",
  },
  "pending-leave": {
    iconWrap: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    count: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    countIdle: "bg-violet-500/8 text-violet-700/70 dark:text-violet-300/70",
    tile: "bg-gradient-to-br from-violet-500/12 via-card to-indigo-500/8 ring-1 ring-inset ring-violet-500/12",
    link: "text-violet-700 dark:text-violet-300",
    glow: "bg-violet-400/20",
  },
  "performance-reviews": {
    iconWrap: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
    count: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
    countIdle: "bg-fuchsia-500/8 text-fuchsia-700/70 dark:text-fuchsia-300/70",
    tile: "bg-gradient-to-br from-fuchsia-500/12 via-card to-pink-500/8 ring-1 ring-inset ring-fuchsia-500/12",
    link: "text-fuchsia-700 dark:text-fuchsia-300",
    glow: "bg-fuchsia-400/20",
  },
};

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

function resolveCardTone(id: string, visualTone: DashboardVisualTone): CardTone {
  if (visualTone !== "vibrant") return DEFAULT_CARD_TONE;
  return TASK_CARD_TONES[id] ?? {
    iconWrap: "bg-primary/15 text-primary",
    count: "bg-primary/15 text-primary",
    countIdle: "bg-muted/70 text-muted-foreground",
    tile: "bg-gradient-to-br from-primary/10 via-card to-sky-500/8 ring-1 ring-inset ring-primary/12",
    link: "text-primary",
    glow: "bg-primary/20",
  };
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
        "relative flex min-h-0 flex-col justify-between overflow-hidden",
        dashboardTileClass,
        tone.tile,
      )}
    >
      {visualTone === "vibrant" && tone.glow ? (
        <span
          className={cn(
            "pointer-events-none absolute -right-5 -top-5 size-20 rounded-full blur-2xl",
            tone.glow,
          )}
          aria-hidden
        />
      ) : null}
      <div className="relative z-10 flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone.iconWrap,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">{item.label}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="relative z-10 mt-2 flex items-end justify-between gap-2">
        <span
          className={cn(
            "rounded-md px-2.5 py-0.5 text-base font-semibold tabular-nums leading-none",
            hasWork ? tone.count : tone.countIdle,
          )}
        >
          {item.count ?? 0}
        </span>
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", tone.link)}>
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
}: {
  items: DashboardTaskItem[];
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
        visualTone === "vibrant" &&
          "bg-gradient-to-br from-amber-500/[0.06] via-card to-violet-500/[0.06] ring-1 ring-inset ring-amber-500/10",
      )}
    >
      <SectionHeading
        title="Focus Today"
        description={description}
        icon={Sparkles}
        visualTone={visualTone}
        toneClass="bg-amber-500/15 text-amber-700 dark:text-amber-300"
      />

      <div className="grid min-h-0 flex-1 grid-cols-2 gap-2.5">
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
        "flex h-full min-h-0 flex-col overflow-hidden",
        dashboardSectionClass,
        visualTone === "vibrant" &&
          "bg-gradient-to-br from-cyan-500/[0.06] via-card to-orange-500/[0.06] ring-1 ring-inset ring-cyan-500/10",
      )}
    >
      <SectionHeading
        title={title}
        description={description}
        icon={Users}
        visualTone={visualTone}
        toneClass="bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
      />

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-2.5",
          cards.length <= 2 ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4",
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
        "flex h-full min-h-0 flex-col overflow-hidden",
        dashboardSectionClass,
        visualTone === "vibrant" &&
          "bg-gradient-to-br from-indigo-500/[0.06] via-card to-rose-500/[0.06] ring-1 ring-inset ring-indigo-500/10",
      )}
    >
      <SectionHeading
        title={title}
        description={description}
        icon={Users}
        visualTone={visualTone}
        toneClass="bg-indigo-500/15 text-indigo-700 dark:text-indigo-300"
      />

      <div className="grid min-h-0 flex-1 grid-rows-2 gap-2.5">
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
  rightPanel = "holidays",
  rightFocusItems,
  rightFocusTitle,
  rightFocusDescription,
  visualTone = "default",
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
  visualTone?: DashboardVisualTone;
}) {
  return (
    <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 overflow-hidden">
      <div className="grid min-h-0 gap-3 overflow-hidden xl:grid-cols-2 xl:items-stretch">
        <HrPriorityFocus
          items={tasks}
          description={focusDescription}
          visualTone={visualTone}
        />
        {rightPanel === "focus-pair" ? (
          <FocusPairPanel
            items={rightFocusItems ?? []}
            title={rightFocusTitle}
            description={rightFocusDescription}
            visualTone={visualTone}
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
          visualTone={visualTone}
        />
      </div>
    </div>
  );
}
