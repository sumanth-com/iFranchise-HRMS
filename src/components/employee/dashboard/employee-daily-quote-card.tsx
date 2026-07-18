import { Flame, Heart } from "lucide-react";

const QUOTES: string[] = [
  "Discipline beats motivation. Show up.",
  "Small steps today, big wins tomorrow.",
  "Done is better than perfect.",
  "Your only competition is yesterday's you.",
  "Show up. Level up.",
  "Consistency is your superpower.",
  "Do the hard thing first.",
  "Progress over perfection.",
  "Make it happen — no excuses.",
  "Focus. Finish. Flex.",
  "Big goals need bold moves.",
  "Winners do what others won't.",
  "Stay hungry. Stay sharp.",
  "Effort today, results tomorrow.",
  "Push past comfortable.",
  "Be relentless.",
];

// Flirty / rizz-style hype lines — each STARTS with the employee's name.
const SWEET_LINES: string[] = [
  "{name}, the grind fears you today — go own it. 🔥",
  "{name}, you're too good to play small. Show them. 💫",
  "{name}, main-character energy on. Go run today. 🌟",
  "{name}, they can't handle your level — prove it. 💪",
  "{name}, charm on, focus sharp. Today's yours. 😎",
  "{name}, go make today jealous of you. ⚡",
  "{name}, less doubting, more dominating. You got this. 🚀",
  "{name}, your potential called — it wants a raise. 📈",
  "{name}, be so good they can't ignore you. 🔥",
  "{name}, effortless and unstoppable, as usual. 😏",
  "{name}, turn that pressure into a highlight reel. 🎬",
  "{name}, the goals don't stand a chance today. 🎯",
  "{name}, glow up, level up, show up. ✨",
  "{name}, you're the upgrade this day needed. 💎",
  "{name}, stay sharp — greatness looks good on you. 💛",
  "{name}, go be the reason today goes right. 🌈",
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
  const quote = QUOTES[((day % QUOTES.length) + QUOTES.length) % QUOTES.length];
  const sweetIndex = (((day * 7 + 3) % SWEET_LINES.length) + SWEET_LINES.length) % SWEET_LINES.length;
  const sweetLine = SWEET_LINES[sweetIndex].replace(/\{name\}/g, name);

  return (
    <section className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden rounded-xl border bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-amber-500/10 p-4 shadow-sm">
      <div className="pointer-events-none absolute -top-8 -right-6 size-24 rounded-full bg-fuchsia-400/20 blur-2xl" />
      <div className="relative flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-fuchsia-500 text-white shadow-md">
            <Flame className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
              Daily Boost
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium italic leading-snug">
              &ldquo;{quote}&rdquo;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2">
          <Heart className="size-4 shrink-0 text-rose-500" />
          <p className="line-clamp-2 min-w-0 text-sm font-medium leading-snug text-foreground">
            {sweetLine}
          </p>
        </div>
      </div>
    </section>
  );
}
