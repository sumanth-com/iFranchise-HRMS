import { Heart, Sparkles } from "lucide-react";

type DailyBoost = {
  quote: string;
  personal: string;
};

const DAILY_BOOSTS: DailyBoost[] = [
  {
    quote: "You don't have to carry everything alone.\nGentle progress still counts as progress.",
    personal:
      "{name}, the way you show up — even on ordinary days —\nmakes this workplace feel a little warmer. 💛",
  },
  {
    quote: "Your worth isn't measured by how busy you are.\nRest, breathe, and trust your own pace.",
    personal:
      "{name}, someone here is grateful for you today,\neven if no one has said it out loud yet. 🌸",
  },
  {
    quote: "Small kindnesses ripple farther than we ever see.\nOne good moment can change someone's whole day.",
    personal:
      "{name}, you bring something to this team\nthat no one else can replace. ✨",
  },
  {
    quote: "It's okay to grow quietly.\nNot every win needs an audience to be real.",
    personal:
      "{name}, be proud of how far you've come —\nthe hard days didn't break you; they shaped you. 🌿",
  },
  {
    quote: "You are allowed to take up space.\nYour ideas, your voice, and your presence all matter.",
    personal:
      "{name}, today is a good day to be gentle with yourself\nand brave in the small things. 💫",
  },
  {
    quote: "Healing and learning can happen at the same time.\nYou're not behind — you're becoming.",
    personal:
      "{name}, the team feels steadier when you're around.\nThank you for being you. 🤍",
  },
  {
    quote: "A soft heart is not a weak one.\nCaring deeply is one of the bravest things you can do.",
    personal:
      "{name}, may today hold one quiet moment\nthat reminds you how valued you truly are. 🌼",
  },
  {
    quote: "You don't need to earn your place here.\nYou already belong — exactly as you are.",
    personal:
      "{name}, your effort matters, your presence matters,\nand so do you — not just what you produce. 💛",
  },
  {
    quote: "Some days are for building; some are for resting.\nBoth are part of a life well lived.",
    personal:
      "{name}, I hope something beautiful finds you today —\na smile, a win, or simply a moment of peace. ☀️",
  },
  {
    quote: "The world needs more people who care the way you do.\nKeep that light — it's rare and real.",
    personal:
      "{name}, you're doing better than you think.\nGive yourself the same grace you'd give a friend. 🌈",
  },
  {
    quote: "Every morning is a quiet invitation to begin again.\nYesterday doesn't get the final word.",
    personal:
      "{name}, your kindness leaves a mark on people\nlong after the moment has passed. 💝",
  },
  {
    quote: "Strength can look like asking for help.\nStrength can also look like simply getting through the day.",
    personal:
      "{name}, may you feel seen, appreciated, and enough —\nnot someday, but right here, right now. 🌷",
  },
  {
    quote: "You are more than your to-do list.\nYour story is bigger than any single busy week.",
    personal:
      "{name}, the little things you do with care\nadd up to something truly meaningful. ✨",
  },
  {
    quote: "Hope grows in ordinary moments.\nLook for one today — it might be closer than you think.",
    personal:
      "{name}, you're allowed to be proud of yourself today.\nYou've earned that. 🤍",
  },
  {
    quote: "No one has it all figured out.\nWe're all learning, together, one day at a time.",
    personal:
      "{name}, may today feel a little lighter,\na little kinder, and a little more yours. 🌸",
  },
  {
    quote: "Your presence is a gift to the people around you.\nNever underestimate the warmth you bring.",
    personal:
      "{name}, keep going gently —\nthe best parts of your journey may still be ahead. 🌿",
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
}: {
  name: string;
  referenceDate: string;
}) {
  const day = daysSinceEpoch(referenceDate);
  const index = ((day % DAILY_BOOSTS.length) + DAILY_BOOSTS.length) % DAILY_BOOSTS.length;
  const boost = DAILY_BOOSTS[index];
  const personalLine = boost.personal.replace(/\{name\}/g, name);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-violet-500/10 p-4 shadow-sm">
      <div className="pointer-events-none absolute -top-8 -right-6 size-24 rounded-full bg-rose-400/15 blur-2xl" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-white shadow-md">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
              Daily Boost
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm font-medium leading-relaxed text-foreground/90">
              {boost.quote}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
          <Heart className="mt-0.5 size-4 shrink-0 fill-rose-500/20 text-rose-500" />
          <p className="min-w-0 whitespace-pre-line text-sm font-medium leading-relaxed text-foreground">
            {personalLine}
          </p>
        </div>
      </div>
    </section>
  );
}
