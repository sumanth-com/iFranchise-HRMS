"use client";

import { useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Cake, CalendarDays, Newspaper, Pencil, Settings2, Sparkles } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { Button } from "@/components/common/button";
import {
  AnnouncementIcon,
  BirthdayCelebrationBurst,
  useCelebrationsCarousel,
} from "@/components/employee/dashboard/celebrations-carousel-helpers";
import { DashboardAnnouncementsManager } from "@/components/employee/dashboard/dashboard-announcements-manager";
import { TeamUpdatesPanel } from "@/components/employee/dashboard/important-notices-slideshow";
import {
  EmployeeSectionCard,
  employeeDateBadgeClass,
  employeeSectionClass,
} from "@/components/employee/dashboard/employee-module-primitives";
import { HolidayGlyph } from "@/components/employee/dashboard/holiday-glyph";
import { birthdayCardMessage } from "@/lib/employee/birthday-utils";
import { getDirectoryAssetPhoto } from "@/lib/employee/directory-asset-photos";
import { getSignedUrlAction } from "@/lib/employees/actions";
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

const combinedIconSlotClass =
  "flex size-14 shrink-0 items-center justify-center";

function birthdayInitials(firstName: string, lastName: string) {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  return initials || first.toUpperCase() || "?";
}

function CelebrationBirthdayPhoto({
  firstName,
  lastName,
  profileImagePath,
  signedUrl,
  size = "md",
  isToday = false,
}: {
  firstName: string;
  lastName: string;
  profileImagePath?: string | null;
  signedUrl?: string | null;
  size?: "md" | "lg";
  isToday?: boolean;
}) {
  const person = useMemo(
    () => ({
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
    }),
    [firstName, lastName],
  );
  const assetPhoto = useMemo(() => getDirectoryAssetPhoto(person), [person]);
  const [imageUrl, setImageUrl] = useState<string | null>(signedUrl ?? null);
  const [assetFailed, setAssetFailed] = useState(false);
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setAssetFailed(false);
    setRemoteFailed(false);

    if (signedUrl) {
      setImageUrl(signedUrl);
      return;
    }

    if (!profileImagePath) {
      setImageUrl(null);
      return;
    }

    void getSignedUrlAction("profileImages", profileImagePath).then((result) => {
      if (result.success) {
        setImageUrl(result.data);
      }
    });
  }, [profileImagePath, signedUrl]);

  const showUpload = Boolean(imageUrl) && !remoteFailed;
  const showAsset = Boolean(assetPhoto) && !assetFailed && !showUpload;
  const dimension = size === "lg" ? "size-[4.75rem]" : "size-14";
  const shellClass = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-violet-500/15 to-rose-500/15 shadow-sm ring-2 ring-background",
    dimension,
    isToday ? "ring-rose-300/70" : "ring-violet-200/60",
  );
  const imageClass = cn(dimension, "rounded-full object-cover object-top");

  if (showUpload && imageUrl) {
    return (
      <span className={shellClass}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={person.fullName || firstName}
          className={imageClass}
          onError={() => setRemoteFailed(true)}
        />
      </span>
    );
  }

  if (showAsset && assetPhoto) {
    return (
      <span className={shellClass}>
        <Image
          src={assetPhoto}
          alt={person.fullName || firstName}
          width={size === "lg" ? 76 : 56}
          height={size === "lg" ? 76 : 56}
          className={imageClass}
          onError={() => setAssetFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        shellClass,
        "bg-gradient-to-br from-blue-600 to-violet-600 text-sm font-semibold tracking-wide text-white",
        size === "lg" && "text-base",
      )}
      aria-hidden
    >
      {birthdayInitials(firstName, lastName)}
    </span>
  );
}

function DateWidget({ date }: { date: string }) {
  const eventDate = parseISO(date.slice(0, 10));
  return (
    <div className={cn(employeeDateBadgeClass, "w-12")}>
      <div className="bg-gradient-to-br from-blue-600 to-violet-600 px-1 py-0.5 text-[10px] font-bold tracking-[0.14em] text-white uppercase">
        {format(eventDate, "MMM")}
      </div>
      <div className="flex min-h-[2.15rem] items-center justify-center bg-card py-0.5 text-xl font-bold tabular-nums leading-none text-foreground">
        {format(eventDate, "d")}
      </div>
    </div>
  );
}

type CelebrationPair = {
  id: string;
  holiday: EmployeeUpcomingEvent | null;
  birthday: EmployeeUpcomingEvent | null;
};

function pairHolidayBirthdaySlides(events: EmployeeUpcomingEvent[]): CelebrationPair[] {
  const holidays = events.filter((event) => event.type === "holiday");
  const birthdays = events.filter(
    (event) => event.type === "birthday" || event.type === "anniversary",
  );
  const count = Math.max(holidays.length, birthdays.length);
  if (count === 0) return [];

  return Array.from({ length: count }, (_, index) => {
    const holiday = holidays[index] ?? null;
    const birthday = birthdays[index] ?? null;
    return {
      id: `pair-${holiday?.id ?? "none"}-${birthday?.id ?? "none"}-${index}`,
      holiday,
      birthday,
    };
  });
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
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-gradient-to-b from-rose-500/[0.07] to-rose-500/[0.02] px-5 py-5 text-center ring-1 ring-rose-500/15",
        isToday && "from-rose-500/[0.12] ring-rose-500/25",
      )}
    >
      <BirthdayCelebrationBurst active={active && isToday} />

      <div className="relative shrink-0">
        <CelebrationBirthdayPhoto
          firstName={event.firstName || event.title}
          lastName={event.lastName || ""}
          profileImagePath={event.profileImagePath}
          signedUrl={event.avatarUrl}
          size="lg"
          isToday={isToday}
        />
        {isToday ? (
          <span className="absolute -right-0.5 -bottom-0.5 flex size-6 items-center justify-center rounded-full bg-rose-500 text-white shadow-md ring-2 ring-background">
            <Cake className="size-3.5" />
          </span>
        ) : null}
      </div>

      <span className="mt-3.5 inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-rose-700 uppercase dark:bg-rose-400/20 dark:text-rose-300">
        {isToday ? "Happy Birthday" : "Coming up"}
      </span>

      <p className="mt-2.5 line-clamp-1 text-base font-semibold tracking-tight text-foreground sm:text-lg">
        {event.title}
      </p>

      <p className="mt-1 line-clamp-2 max-w-[18rem] text-xs text-muted-foreground">
        {birthdayCardMessage({
          firstName: event.firstName,
          title: event.title,
          isToday,
        })}
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

function CombinedHolidayPanel({
  event,
  referenceDate,
}: {
  event: EmployeeUpcomingEvent;
  referenceDate: string;
}) {
  const timing = countdownLabel(event.date, referenceDate);

  return (
    <div className="flex min-h-0 flex-1 items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-b from-violet-500/[0.07] to-violet-500/[0.02] px-4 py-3.5 ring-1 ring-violet-500/15">
      <span
        className={cn(
          combinedIconSlotClass,
          "celebration-glyph text-[3.75rem] leading-none",
        )}
      >
        <HolidayGlyph name={event.title} className="text-[inherit] leading-none" />
      </span>
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center rounded-full bg-violet-500/12 px-2 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 uppercase dark:bg-violet-400/20 dark:text-violet-300">
          {timing}
        </span>
        <p className="mt-1 line-clamp-1 text-base font-bold tracking-tight text-foreground">
          {event.title}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
          {event.subtitle || "Company Holiday"}
        </p>
      </div>
      <DateWidget date={event.date} />
    </div>
  );
}

function CombinedBirthdayPanel({
  event,
  referenceDate,
  active,
}: {
  event: EmployeeUpcomingEvent;
  referenceDate: string;
  active: boolean;
}) {
  const timing = countdownLabel(event.date, referenceDate);
  const isToday = timing === "Today";

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-1 items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-b from-rose-500/[0.07] to-rose-500/[0.02] px-4 py-3.5 ring-1 ring-rose-500/15",
        isToday && "from-rose-500/[0.12] ring-rose-500/25",
      )}
    >
      <BirthdayCelebrationBurst active={active && isToday} />
      <div className={cn("relative", combinedIconSlotClass)}>
        <CelebrationBirthdayPhoto
          firstName={event.firstName || event.title}
          lastName={event.lastName || ""}
          profileImagePath={event.profileImagePath}
          signedUrl={event.avatarUrl}
          size="md"
          isToday={isToday}
        />
        {isToday ? (
          <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-rose-500 text-white shadow-md ring-2 ring-background">
            <Cake className="size-3" />
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-rose-700 uppercase dark:bg-rose-400/20 dark:text-rose-300">
          {isToday ? "Today" : "Birthday"}
        </span>
        <p className="mt-1 line-clamp-1 text-base font-bold tracking-tight text-foreground">
          {event.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {birthdayCardMessage({
            firstName: event.firstName,
            title: event.title,
            isToday,
          })}
        </p>
      </div>
      <DateWidget date={event.date} />
    </div>
  );
}

function CombinedCelebrationSlide({
  pair,
  referenceDate,
  active,
}: {
  pair: CelebrationPair;
  referenceDate: string;
  active: boolean;
}) {
  const { holiday, birthday } = pair;

  if (holiday && birthday) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-2">
        <CombinedHolidayPanel event={holiday} referenceDate={referenceDate} />
        <CombinedBirthdayPanel
          event={birthday}
          referenceDate={referenceDate}
          active={active}
        />
      </div>
    );
  }

  if (holiday) {
    return <HolidaySlide event={holiday} referenceDate={referenceDate} />;
  }

  if (birthday) {
    return (
      <BirthdaySlide event={birthday} referenceDate={referenceDate} active={active} />
    );
  }

  return null;
}

export function EmployeeUpcomingEvents({
  events,
  referenceDate,
  className,
  canManageAnnouncements = false,
  pairHolidayBirthday = false,
  showImportantNotices = false,
}: {
  events: EmployeeUpcomingEvent[];
  referenceDate: string;
  className?: string;
  canManageAnnouncements?: boolean;
  pairHolidayBirthday?: boolean;
  showImportantNotices?: boolean;
}) {
  const router = useRouter();
  const pairedSlides = useMemo(
    () => (pairHolidayBirthday ? pairHolidayBirthdaySlides(events) : []),
    [events, pairHolidayBirthday],
  );
  const teamUpdates = useMemo(
    () => events.filter((event) => event.type === "announcement"),
    [events],
  );
  const singleSlides = pairHolidayBirthday ? [] : events;
  const slideCount = pairHolidayBirthday ? pairedSlides.length : singleSlides.length;
  const { index, goTo, setPaused } = useCelebrationsCarousel(slideCount);
  const [manageOpen, setManageOpen] = useState(false);
  const [panel, setPanel] = useState<"celebrations" | "notices">("celebrations");
  const multi = slideCount > 1;
  const showDashboardManage = canManageAnnouncements && !showImportantNotices;
  const noticesActive = showImportantNotices && panel === "notices";
  const canEditTeamUpdates = showImportantNotices && canManageAnnouncements;

  useEffect(() => {
    if (noticesActive) setPaused(true);
    else setPaused(false);
  }, [noticesActive, setPaused]);

  const celebrationsBody =
    slideCount > 0 ? (
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
          {pairHolidayBirthday
            ? pairedSlides.map((pair, slideIndex) => {
                const active = slideIndex === index;
                return (
                  <div
                    key={pair.id}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-500 ease-out",
                      active ? "z-[1] opacity-100" : "z-0 pointer-events-none opacity-0",
                    )}
                    aria-hidden={!active}
                  >
                    <CombinedCelebrationSlide
                      pair={pair}
                      referenceDate={referenceDate}
                      active={active}
                    />
                  </div>
                );
              })
            : singleSlides.map((event, slideIndex) => {
                const active = slideIndex === index;
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "absolute inset-0 transition-opacity duration-500 ease-out",
                      active ? "z-[1] opacity-100" : "z-0 pointer-events-none opacity-0",
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
            {(pairHolidayBirthday ? pairedSlides : singleSlides).map((slide, slideIndex) => (
              <button
                key={slide.id}
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
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl bg-violet-500/[0.04] px-5 text-center ring-1 ring-violet-500/12">
        <span className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
          <CalendarDays className="size-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-foreground">
          Nothing to celebrate this week
        </p>
        <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-muted-foreground">
          No holidays or birthdays coming up. Enjoy a productive week!
        </p>
      </div>
    );

  if (showImportantNotices) {
    return (
      <section className={cn(employeeSectionClass, "flex h-full min-h-0 flex-col overflow-hidden", className)}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Button
              type="button"
              size="xs"
              variant={panel === "celebrations" ? "default" : "outline"}
              className="gap-1"
              aria-pressed={panel === "celebrations"}
              onClick={() => {
                setPanel("celebrations");
                setManageOpen(false);
              }}
            >
              <Sparkles className="size-3.5" />
              Celebrations & This Week
            </Button>
            <Button
              type="button"
              size="xs"
              variant={panel === "notices" ? "default" : "outline"}
              className="gap-1"
              aria-pressed={panel === "notices"}
              onClick={() => setPanel("notices")}
            >
              <Newspaper className="size-3.5" />
              Team Updates
            </Button>
          </div>
          {panel === "notices" && canEditTeamUpdates ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              className="shrink-0 gap-1"
              onClick={() => setManageOpen(true)}
            >
              <Pencil className="size-3" />
              Edit
            </Button>
          ) : null}
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          {panel === "notices"
            ? "Quick notes from HR and leadership."
            : "Highlights for today and this week."}
        </p>
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-500 ease-out"
            style={{
              width: "200%",
              transform: noticesActive ? "translateX(-50%)" : "translateX(0)",
            }}
          >
            <div className="flex h-full w-1/2 min-w-0 flex-col pr-1">{celebrationsBody}</div>
            <div className="flex h-full w-1/2 min-w-0 flex-col pl-1">
              <TeamUpdatesPanel events={teamUpdates} />
            </div>
          </div>
        </div>
        {canEditTeamUpdates ? (
          <DashboardAnnouncementsManager
            open={manageOpen}
            onOpenChange={(open) => {
              setManageOpen(open);
              if (!open) router.refresh();
            }}
          />
        ) : null}
      </section>
    );
  }

  return (
    <EmployeeSectionCard
      title="Celebrations & This Week"
      description="Highlights for today and this week."
      className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
      action={
        showDashboardManage ? (
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
      {celebrationsBody}
      {showDashboardManage ? (
        <DashboardAnnouncementsManager open={manageOpen} onOpenChange={setManageOpen} />
      ) : null}
    </EmployeeSectionCard>
  );
}
