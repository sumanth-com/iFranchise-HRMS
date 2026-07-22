import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type DailyBoost = {
  quote: string;
  personal: string;
};

const DAILY_BOOSTS: DailyBoost[] = [
  {
    quote: "You don't have to carry everything alone.\nGentle progress still counts as progress.",
    personal:
      "{name}, the way you show up — even on ordinary days — makes this workplace feel a little warmer. 💛",
  },
  {
    quote: "Your worth isn't measured by how busy you are.\nRest, breathe, and trust your own pace.",
    personal:
      "{name}, someone here is grateful for you today, even if no one has said it out loud yet. 🌸",
  },
  {
    quote: "Small kindnesses ripple farther than we ever see.\nOne good moment can change someone's whole day.",
    personal:
      "{name}, you bring something to this team that no one else can replace. ✨",
  },
  {
    quote: "It's okay to grow quietly.\nNot every win needs an audience to be real.",
    personal:
      "{name}, be proud of how far you've come — the hard days didn't break you; they shaped you. 🌿",
  },
  {
    quote: "You are allowed to take up space.\nYour ideas, your voice, and your presence all matter.",
    personal:
      "{name}, today is a good day to be gentle with yourself and brave in the small things. 💫",
  },
  {
    quote: "Healing and learning can happen at the same time.\nYou're not behind — you're becoming.",
    personal:
      "{name}, the team feels steadier when you're around. Thank you for being you. 🤍",
  },
  {
    quote: "A soft heart is not a weak one.\nCaring deeply is one of the bravest things you can do.",
    personal:
      "{name}, may today hold one quiet moment that reminds you how valued you truly are. 🌼",
  },
  {
    quote: "You don't need to earn your place here.\nYou already belong — exactly as you are.",
    personal:
      "{name}, your effort matters, your presence matters, and so do you — not just what you produce. 💛",
  },
  {
    quote: "Some days are for building; some are for resting.\nBoth are part of a life well lived.",
    personal:
      "{name}, I hope something beautiful finds you today — a smile, a win, or simply a moment of peace. ☀️",
  },
  {
    quote: "The world needs more people who care the way you do.\nKeep that light — it's rare and real.",
    personal:
      "{name}, you're doing better than you think. Give yourself the same grace you'd give a friend. 🌈",
  },
  {
    quote: "Every morning is a quiet invitation to begin again.\nYesterday doesn't get the final word.",
    personal:
      "{name}, your kindness leaves a mark on people long after the moment has passed. 💝",
  },
  {
    quote: "Strength can look like asking for help.\nStrength can also look like simply getting through the day.",
    personal:
      "{name}, may you feel seen, appreciated, and enough — not someday, but right here, right now. 🌷",
  },
  {
    quote: "You are more than your to-do list.\nYour story is bigger than any single busy week.",
    personal:
      "{name}, the little things you do with care add up to something truly meaningful. ✨",
  },
  {
    quote: "Hope grows in ordinary moments.\nLook for one today — it might be closer than you think.",
    personal:
      "{name}, you're allowed to be proud of yourself today. You've earned that. 🤍",
  },
  {
    quote: "No one has it all figured out.\nWe're all learning, together, one day at a time.",
    personal:
      "{name}, may today feel a little lighter, a little kinder, and a little more yours. 🌸",
  },
  {
    quote: "Your presence is a gift to the people around you.\nNever underestimate the warmth you bring.",
    personal:
      "{name}, keep going gently — the best parts of your journey may still be ahead. 🌿",
  },
];

function daysSinceEpoch(referenceDate: string) {
  const ms = Date.parse(`${referenceDate}T00:00:00`);
  if (Number.isNaN(ms)) return 0;
  return Math.floor(ms / 86_400_000);
}

export function EmployeeDailyQuoteCard({
  name,
  referenceDate,
  className,
}: {
  name: string;
  referenceDate: string;
  className?: string;
}) {
  const day = daysSinceEpoch(referenceDate);
  const index = ((day % DAILY_BOOSTS.length) + DAILY_BOOSTS.length) % DAILY_BOOSTS.length;
  const boost = DAILY_BOOSTS[index];
  const personalLine = boost.personal.replace(/\{name\}/g, name);
  const quoteLines = boost.quote.split("\n");

  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-violet-500/10 p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-white shadow-sm">
          <Sparkles className="size-3.5" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
          Daily Boost
        </p>
      </div>

      <div className="mt-4 space-y-1">
        {quoteLines.map((line, index) => (
          <p key={index} className="text-sm leading-6 text-foreground/90">
            {line}
          </p>
        ))}
      </div>

      <p className="mt-auto border-t border-rose-500/15 pt-4 text-sm leading-6 text-foreground/80">
        {personalLine}
      </p>
    </section>
  );
}
