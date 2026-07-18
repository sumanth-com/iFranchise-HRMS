import { differenceInCalendarDays, parseISO } from "date-fns";
import { Cake, Gift, PartyPopper } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EmployeeBirthdayPerson } from "@/types/employee-dashboard";

type Tone = "festive" | "soft" | "calm";

const TONE_BADGE: Record<Tone, string> = {
  festive: "bg-gradient-to-br from-pink-500 via-rose-500 to-amber-400 text-white shadow-md",
  soft: "bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white shadow-sm",
  calm: "bg-gradient-to-br from-violet-500 to-sky-400 text-white shadow-sm",
};

function BirthdayBadge({
  tone,
  animate,
  icon: Icon,
}: {
  tone: Tone;
  animate?: boolean;
  icon: typeof Cake;
}) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full",
        TONE_BADGE[tone],
        animate && "animate-bounce",
      )}
      style={animate ? { animationDuration: "1.6s" } : undefined}
      aria-hidden
    >
      <Icon className="size-6" />
    </span>
  );
}

function firstName(name: string) {
  return name.split(" ").filter(Boolean)[0] ?? name;
}

function joinNames(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

/** Floating confetti + balloons that keep the celebration feeling alive. */
function Celebration() {
  const confetti = [
    { className: "left-[8%] top-2 bg-pink-400", delay: "0ms" },
    { className: "left-[24%] top-5 bg-amber-400", delay: "200ms" },
    { className: "left-[40%] top-1 bg-sky-400", delay: "450ms" },
    { className: "right-[34%] top-4 bg-violet-400", delay: "150ms" },
    { className: "right-[18%] top-2 bg-emerald-400", delay: "600ms" },
    { className: "right-[8%] top-6 bg-rose-400", delay: "300ms" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -top-8 left-1/2 size-24 -translate-x-1/2 rounded-full bg-pink-400/20 blur-2xl animate-pulse" />
      {confetti.map((piece, index) => (
        <span
          key={index}
          className={cn("absolute size-1.5 rotate-45 rounded-[1px] animate-bounce", piece.className)}
          style={{ animationDelay: piece.delay, animationDuration: "1.6s" }}
        />
      ))}
    </div>
  );
}

export function EmployeeBirthdayCard({
  birthdays,
  referenceDate,
}: {
  birthdays: EmployeeBirthdayPerson[];
  referenceDate: string;
}) {
  const todays = birthdays.filter((b) => b.date === referenceDate);
  const upcoming = birthdays
    .filter((b) => b.date > referenceDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Someone is celebrating today — full festive treatment.
  if (todays.length > 0) {
    const self = todays.find((b) => b.isSelf);
    const others = todays.filter((b) => !b.isSelf);

    let title: string;
    let subtitle: string;
    if (self) {
      title = `Happy Birthday, ${firstName(self.name)}! 🎉`;
      subtitle =
        others.length > 0
          ? `It's your special day — also celebrating ${joinNames(others.map((o) => firstName(o.name)))}!`
          : "Wishing you joy, success, and a wonderful year ahead.";
    } else {
      title = `It's ${joinNames(others.map((o) => firstName(o.name)))}'s birthday today! 🎂`;
      subtitle = "Take a moment to send your warm wishes.";
    }

    return (
      <section className="relative shrink-0 overflow-hidden rounded-xl border border-pink-500/25 bg-gradient-to-r from-pink-500/10 via-amber-500/10 to-violet-500/10 p-4 shadow-sm">
        <Celebration />
        <div className="relative flex items-center gap-3">
          <BirthdayBadge tone="festive" animate icon={PartyPopper} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </section>
    );
  }

  // A birthday is coming up within the week — gentle heads-up.
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const days = differenceInCalendarDays(parseISO(next.date), parseISO(referenceDate));
    const whenLabel = days === 1 ? "tomorrow" : `in ${days} days`;

    return (
      <section className="relative shrink-0 overflow-hidden rounded-xl border bg-gradient-to-r from-rose-500/5 via-card to-amber-500/5 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <BirthdayBadge tone="soft" animate icon={Gift} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {next.isSelf
                ? `Your birthday is ${whenLabel}! 🎂`
                : `${firstName(next.name)}'s birthday is ${whenLabel} 🎉`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {next.isSelf
                ? "Something special is just around the corner."
                : "Plan a little surprise to make their day."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Nothing this week — calm, still colorful placeholder.
  return (
    <section className="shrink-0 overflow-hidden rounded-xl border bg-gradient-to-r from-violet-500/5 via-card to-sky-500/5 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <BirthdayBadge tone="calm" icon={Cake} />
        <div className="min-w-0">
          <p className="text-sm font-medium">No birthdays this week</p>
          <p className="text-xs text-muted-foreground">
            The next celebration will light up right here.
          </p>
        </div>
      </div>
    </section>
  );
}
