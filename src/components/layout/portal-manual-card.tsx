"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  Archive,
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  BookText,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock3,
  Download,
  FileText,
  Files,
  Filter,
  Gauge,
  GitBranch,
  GitCompare,
  Handshake,
  History,
  Info,
  KeyRound,
  LaptopMinimal,
  LayoutDashboard,
  LineChart,
  List,
  LogIn,
  MapPin,
  MessageSquare,
  Mic,
  Package,
  PieChart,
  Plug,
  Plus,
  Receipt,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingUp,
  UserRound,
  UserRoundPlus,
  UserSearch,
  Users,
  UsersRound,
  Wallet,
  Wrench,
  Zap,
  Gift,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  ManualFeature,
  ManualSection,
  ManualSectionIcon,
  PortalManual,
} from "@/lib/help/portal-manual";
import { cn } from "@/lib/utils";

const SECTION_ICONS: Record<ManualSectionIcon, LucideIcon> = {
  layout: LayoutDashboard,
  user: UserRound,
  "calendar-check": CalendarCheck,
  wallet: Wallet,
  "file-text": FileText,
  "calendar-days": CalendarDays,
  target: Target,
  laptop: LaptopMinimal,
  bell: Bell,
  settings: Settings,
  users: Users,
  briefcase: BriefcaseBusiness,
  "bar-chart": BarChart3,
  building: Building2,
  shield: Shield,
  "user-plus": UserRoundPlus,
  "check-square": CheckSquare,
  clipboard: ClipboardList,
  package: Package,
  banknote: Banknote,
};

const FEATURE_ICONS: Record<ManualFeature["icon"], LucideIcon> = {
  gauge: Gauge,
  zap: Zap,
  user: UserRound,
  users: Users,
  badge: BadgeCheck,
  "log-in": LogIn,
  history: History,
  wrench: Wrench,
  receipt: Receipt,
  archive: Archive,
  book: BookText,
  files: Files,
  download: Download,
  wallet: Wallet,
  plus: Plus,
  list: List,
  scroll: ScrollText,
  target: Target,
  activity: Activity,
  message: MessageSquare,
  "users-round": UsersRound,
  trending: TrendingUp,
  laptop: LaptopMinimal,
  info: Info,
  bell: Bell,
  clock: Clock3,
  sliders: SlidersHorizontal,
  shield: ShieldCheck,
  layout: LayoutDashboard,
  alert: AlertTriangle,
  search: Search,
  "git-branch": GitBranch,
  calendar: CalendarDays,
  filter: Filter,
  check: CheckCircle2,
  "file-text": FileText,
  briefcase: BriefcaseBusiness,
  "user-search": UserSearch,
  mic: Mic,
  handshake: Handshake,
  "bar-chart": BarChart3,
  pie: PieChart,
  "line-chart": LineChart,
  building: Building2,
  "user-plus": UserRoundPlus,
  "check-square": CheckSquare,
  "map-pin": MapPin,
  gift: Gift,
  banknote: Banknote,
  package: Package,
  key: KeyRound,
  compare: GitCompare,
  plug: Plug,
  clipboard: ClipboardList,
};

function ManualSectionDetail({ section }: { section: ManualSection }) {
  const SectionIcon = SECTION_ICONS[section.icon];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <SectionIcon className="size-5 text-foreground" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {section.group}
          </p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">{section.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {section.summary}
          </p>
        </div>
      </div>

      <div className="space-y-4 border-t pt-5">
        <div className="flex gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
            <Zap className="size-3.5 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold">Why this helps</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {section.useful}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
            <BookOpen className="size-3.5 text-muted-foreground" />
          </span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold">How to use it</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {section.howTo}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t pt-5">
        <div className="mb-3 flex items-center gap-2">
          <List className="size-4 text-muted-foreground" />
          <h4 className="text-sm font-semibold">Everything inside this module</h4>
        </div>
        <ul>
          {section.features.map((feature) => {
            const FeatureIcon = FEATURE_ICONS[feature.icon];
            return (
              <li
                key={feature.name}
                className="flex gap-3 border-b border-border/60 py-3.5 first:pt-0 last:border-0 last:pb-0"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/30">
                  <FeatureIcon className="size-3.5 text-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{feature.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {feature.detail}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/90">
                    <span className="font-medium text-foreground/80">Tip: </span>
                    {feature.tip}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function NavGroup({
  label,
  items,
  activeId,
  onSelect,
}: {
  label: string;
  items: ManualSection[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = SECTION_ICONS[item.icon];
          const isActive = activeId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{item.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function PortalManualCard({ title, description, sections }: PortalManual) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  const active = useMemo(
    () => sections.find((item) => item.id === activeId) ?? sections[0],
    [activeId, sections],
  );

  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, ManualSection[]>();
    for (const section of sections) {
      if (!map.has(section.group)) {
        map.set(section.group, []);
        order.push(section.group);
      }
      map.get(section.group)?.push(section);
    }
    return order.map((label) => ({ label, items: map.get(label) ?? [] }));
  }, [sections]);

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg border bg-muted/20">
        <div className="flex shrink-0 items-center gap-3 border-b px-3.5 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
            <BookOpen className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-none">Portal manual</p>
            <p className="mt-1 text-xs text-muted-foreground">
              What each module is for — tap a name to read it
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setActiveId(sections[0]?.id ?? "");
              setOpen(true);
            }}
          >
            Open
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {groups.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              {groups.length > 1 ? (
                <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </p>
              ) : null}
              <ul className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {group.items.map((item) => {
                  const Icon = SECTION_ICONS[item.icon];
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveId(item.id);
                          setOpen(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <p className="shrink-0 border-t px-3.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Explanations only — no page links. Password reset is limited to 3 requests per day.
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex h-[min(44rem,90vh)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
          showCloseButton
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[15.5rem_minmax(0,1fr)] lg:grid-cols-[17rem_minmax(0,1fr)]">
            <aside className="min-h-0 overflow-y-auto border-b md:border-b-0 md:border-r">
              <nav className="space-y-4 p-3">
                {groups.map((group) => (
                  <NavGroup
                    key={group.label}
                    label={group.label}
                    items={group.items}
                    activeId={active?.id ?? ""}
                    onSelect={setActiveId}
                  />
                ))}
              </nav>
            </aside>

            <div className="min-h-0 overflow-y-auto px-5 py-5 md:px-6">
              {active ? <ManualSectionDetail section={active} /> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end border-t bg-muted/30 px-5 py-3">
            <Button type="button" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
