"use client";

import { Newspaper } from "lucide-react";

import {
  AnnouncementIcon,
  useCelebrationsCarousel,
} from "@/components/employee/dashboard/celebrations-carousel-helpers";
import { cn } from "@/lib/utils";
import type { EmployeeUpcomingEvent } from "@/types/employee-dashboard";

function TeamUpdateSlide({ event }: { event: EmployeeUpcomingEvent }) {
  const isImportant = event.priority === "important";
  const hasImage = Boolean(event.imageUrl);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl px-4 py-4",
        isImportant
          ? "bg-gradient-to-b from-violet-500/[0.1] to-violet-500/[0.03] ring-1 ring-violet-500/25"
          : "bg-gradient-to-b from-violet-500/[0.06] to-transparent ring-1 ring-violet-500/12",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl!}
            alt=""
            className="mb-3 h-20 w-full rounded-xl object-cover shadow-sm ring-1 ring-border/60"
            onError={(eventTarget) => {
              eventTarget.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span
            className={cn(
              "mb-3 flex size-11 items-center justify-center rounded-xl shadow-sm",
              isImportant
                ? "bg-violet-500/15 text-violet-700 ring-1 ring-violet-500/20"
                : "bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/15",
            )}
          >
            <AnnouncementIcon iconKey={event.iconKey} className="size-5" />
          </span>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-violet-500/12 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-violet-700 uppercase dark:bg-violet-400/20 dark:text-violet-300">
            Team update
          </span>
          {isImportant ? (
            <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-800 uppercase dark:bg-amber-400/20 dark:text-amber-300">
              Important
            </span>
          ) : null}
        </div>
        <p className="mt-2.5 line-clamp-2 text-sm font-bold tracking-tight text-foreground">
          {event.title}
        </p>
        {event.message ? (
          <p className="mt-1.5 min-h-0 flex-1 overflow-y-auto text-xs leading-relaxed text-muted-foreground">
            {event.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TeamUpdatesPanel({ events }: { events: EmployeeUpcomingEvent[] }) {
  const { index, goTo, setPaused } = useCelebrationsCarousel(events.length);

  if (events.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center rounded-xl bg-violet-500/[0.04] px-4 text-center ring-1 ring-violet-500/12">
        <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
          <Newspaper className="size-4" />
        </span>
        <p className="mt-2 text-sm font-semibold text-foreground">No team updates</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Short notes from HR or leadership will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-full min-h-0 flex-col"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-0 flex-1">
        {events.map((event, slideIndex) => {
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
              <TeamUpdateSlide event={event} />
            </div>
          );
        })}
      </div>
      {events.length > 1 ? (
        <div className="mt-2.5 flex shrink-0 items-center justify-center gap-1.5">
          {events.map((event, slideIndex) => (
            <button
              key={event.id}
              type="button"
              aria-label={`Show update ${slideIndex + 1}`}
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
  );
}
