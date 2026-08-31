"use client";

import { useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Cake, Settings2, Sparkles } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  AnnouncementIcon,
  BirthdayCelebrationBurst,
  useCelebrationsCarousel,
} from "@/components/employee/dashboard/celebrations-carousel-helpers";
import { DashboardAnnouncementsManager } from "@/components/employee/dashboard/dashboard-announcements-manager";
import { EmployeeSectionCard } from "@/components/employee/dashboard/employee-module-primitives";
import { HolidayGlyph } from "@/components/employee/dashboard/holiday-glyph";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { cn } from "@/lib/utils";
import type { EmployeeUpcomingEvent } from "@/types/employee-dashboard";

function countdownLabel(date: string, referenceDate: string): string {
  try {
    const eventDate = parseISO(date.slice(0, 10));
    const refDate = parseISO(referenceDate.slice(0, 10));
    const days = differenceInCalendarDays(eventDate, refDate);
    if (days <= 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `In ${days} days`;
  } catch {
    return date;
  }
}

function birthdayGreeting(firstName?: string) {
  const name = firstName?.trim();
  if (name) {
    return `Happy Birthday, ${name} — wishing you a year of success and joy.`;
  }
  return "Happy Birthday — wishing you a year of success and joy.";
}

/** Holiday / celebration slide — preserves existing visual language. */
function HolidaySlide({
  event,
  referenceDate,
}: {
  event: EmployeeUpcomingEvent;
  referenceDate: string;
}) {
  const eventDate = parseISO(event.date);
  const timing = countdownLabel(event.date, referenceDate);
  const isToday = timing === "Today";

  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/[0.07] to-violet-500/[0.02] px-5 py-5 text-center ring-1 ring-violet-500/15">
      <span className="celebration-glyph flex size-[7.5rem] shrink-0 items-center justify-center text-[5rem] leading-none sm:size-[9rem] sm:text-[6rem]">
        <HolidayGlyph name={event.title} className="text-[inherit] leading-none" />
      </span>

      <span className="mt-3.5 inline-flex items-center rounded-full bg-violet-500/12 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 uppercase dark:bg-violet-400/20 dark:text-violet-300">
        {timing}
      </span>

      <p className="mt-2.5 line-clamp-1 text-base font-semibold tracking-tight text-foreground sm:text-lg">
        {event.title}
      </p>

      {event.subtitle ? (
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{event.subtitle}</p>
      ) : null}

      <p className="mt-3 text-[11px] font-medium tracking-wide text-muted-foreground/75 tabular-nums uppercase">
        {format(eventDate, "EEEE, d MMM yyyy")}
      </p>
    </div>
  );
}

function BirthdaySlide({
  event,
  referenceDate,
  active,
}: {
  event: EmployeeUpcomingEvent;
  referenceDate: string;
  active: boolean;
}) {
  const eventDate = parseISO(event.date);
  const timing = countdownLabel(event.date, referenceDate);
  const isToday = timing === "Today";

  return (
    <div className="relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-rose-500/[0.07] to-rose-500/[0.02] px-5 py-5 text-center ring-1 ring-rose-500/15">
      <BirthdayCelebrationBurst active={active} />

      <div className="relative shrink-0">
        <EmployeeAvatar
          firstName={event.firstName || event.title}
          lastName={event.lastName || ""}
          profileImagePath={event.profileImagePath}
          signedUrl={event.avatarUrl}
          className="size-16 rounded-2xl ring-2 ring-rose-500/25 sm:size-[4.75rem]"
        />
        {isToday ? (
          <span className="absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
            <Cake className="size-3.5" />
          </span>
        ) : null}
      </div>

      <span className="mt-3.5 inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-rose-700 uppercase dark:bg-rose-400/20 dark:text-rose-300">
        {isToday ? "Today" : "Birthday"}
      </span>

      <p className="mt-2.5 line-clamp-1 text-base font-semibold tracking-tight text-foreground sm:text-lg">
        {event.title}
      </p>

      <p className="mt-1 line-clamp-2 max-w-[18rem] text-xs text-muted-foreground">
        {birthdayGreeting(event.firstName)}
      </p>

      <p className="mt-3 text-[11px] font-medium tracking-wide text-muted-foreground/75 tabular-nums uppercase">
        {format(eventDate, "EEEE, d MMM yyyy")}
        {!isToday ? ` · ${timing}` : null}
      </p>
    </div>
  );
}

function AnnouncementSlide({ event }: { event: EmployeeUpcomingEvent }) {
  const isImportant = event.priority === "important";
  const hasImage = Boolean(event.imageUrl);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl px-5 py-5 text-center",
        isImportant
          ? "bg-gradient-to-b from-violet-500/[0.1] to-violet-500/[0.03] ring-1 ring-violet-500/25"
          : "bg-gradient-to-b from-violet-500/[0.06] to-transparent ring-1 ring-violet-500/12",
      )}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.imageUrl!}
          alt=""
          className="mb-3 size-14 rounded-xl object-cover shadow-sm ring-1 ring-border/60 sm:size-16"
          onError={(eventTarget) => {
            eventTarget.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span
          className={cn(
            "mb-3 flex size-12 items-center justify-center rounded-xl shadow-sm sm:size-14",
            isImportant
              ? "bg-violet-500/15 text-violet-700 ring-1 ring-violet-500/20"
              : "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/15",
          )}
        >
          <AnnouncementIcon iconKey={event.iconKey} className="size-5 sm:size-6" />
        </span>
      )}

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="inline-flex items-center rounded-full bg-violet-500/12 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 uppercase dark:bg-violet-400/20 dark:text-violet-300">
          Notice
        </span>
        {isImportant ? (
          <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 uppercase dark:bg-amber-400/20 dark:text-amber-300">
            Important
          </span>
        ) : null}
      </div>

      <p className="mt-2.5 line-clamp-2 text-base font-semibold tracking-tight text-foreground sm:text-lg">
        {event.title}
      </p>

      {event.message ? (
        <p className="mt-1.5 line-clamp-3 max-w-[20rem] text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
          {event.message}
        </p>
      ) : null}
    </div>
  );
}

function SlideContent({
  event,
  referenceDate,
  active,
}: {
  event: EmployeeUpcomingEvent;
  referenceDate: string;
  active: boolean;
}) {
  if (event.type === "birthday") {
    return <BirthdaySlide event={event} referenceDate={referenceDate} active={active} />;
  }
  if (event.type === "announcement") {
    return <AnnouncementSlide event={event} />;
  }
  return <HolidaySlide event={event} referenceDate={referenceDate} />;
}

export function EmployeeUpcomingEvents({
  events,
  referenceDate,
  className,
  canManageAnnouncements = false,
}: {
  events: EmployeeUpcomingEvent[];
  referenceDate: string;
  className?: string;
  canManageAnnouncements?: boolean;
}) {
  const slides = events;
  const { index, goTo, setPaused } = useCelebrationsCarousel(slides.length);
  const [manageOpen, setManageOpen] = useState(false);
  const multi = slides.length > 1;

  return (
    <EmployeeSectionCard
      title="Celebrations & This Week"
      description="Highlights for today and this week."
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
      action={
        canManageAnnouncements ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Manage announcements"
            onClick={() => setManageOpen(true)}
          >
            <Settings2 className="size-4" />
          </Button>
        ) : null
      }
    >
      {slides.length > 0 ? (
        <div
          className="relative flex min-h-0 flex-1 flex-col"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setPaused(false);
            }
          }}
        >
          <div className="relative min-h-0 flex-1">
            {slides.map((event, slideIndex) => {
              const active = slideIndex === index;
              return (
                <div
                  key={event.id}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-500 ease-out",
                    active ? "z-[1] opacity-100" : "z-0 opacity-0 pointer-events-none",
                  )}
                  aria-hidden={!active}
                >
                  <SlideContent
                    event={event}
                    referenceDate={referenceDate}
                    active={active}
                  />
                </div>
              );
            })}
          </div>

          {multi ? (
            <div className="mt-2.5 flex shrink-0 items-center justify-center gap-1.5">
              {slides.map((event, slideIndex) => (
                <button
                  key={event.id}
                  type="button"
                  aria-label={`Show slide ${slideIndex + 1}`}
                  aria-current={slideIndex === index}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    slideIndex === index
                      ? "w-4 bg-violet-600"
                      : "w-1.5 bg-violet-500/25 hover:bg-violet-500/45",
                  )}
                  onClick={() => goTo(slideIndex)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/15 p-5 text-center dark:bg-white/[0.02]">
          <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Sparkles className="size-4" />
          </span>
          <p className="mt-2 text-xs font-semibold text-foreground">
            Nothing to celebrate this week
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            We&apos;ll highlight birthdays, holidays, and notices here when they come up.
          </p>
        </div>
      )}

      {canManageAnnouncements ? (
        <DashboardAnnouncementsManager open={manageOpen} onOpenChange={setManageOpen} />
      ) : null}
    </EmployeeSectionCard>
  );
}
