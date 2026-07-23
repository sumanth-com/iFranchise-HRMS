"use client";

import { format } from "date-fns";
import { Sparkles } from "lucide-react";

import { resolveDailyBoostMessage } from "@/lib/dashboard/daily-boost-messages";
import { getDailyBoostDisplayName } from "@/lib/employees/parse-employee-name";
import { cn } from "@/lib/utils";

type DailyBoostCardProps = {
  firstName: string;
  lastName?: string;
  personKey: string;
  referenceDate?: string;
  className?: string;
  compact?: boolean;
};

export function DailyBoostCard({
  firstName,
  lastName = "",
  personKey,
  referenceDate,
  className,
  compact = false,
}: DailyBoostCardProps) {
  const dayKey = referenceDate ?? format(new Date(), "yyyy-MM-dd");
  const displayName = getDailyBoostDisplayName(firstName, lastName);
  const { line1, line2 } = resolveDailyBoostMessage(dayKey, personKey, displayName);

  if (compact) {
    return (
      <section
        className={cn(
          "flex items-start gap-3 overflow-hidden rounded-xl border bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-violet-500/10 px-4 py-3 shadow-sm",
          className,
        )}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-amber-400 text-white shadow-sm">
          <Sparkles className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
            Daily Boost
          </p>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-foreground/90">
            {line1} {line2}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-violet-500/10 p-5 shadow-sm",
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

      <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center space-y-2">
        <p className="text-sm leading-6 text-foreground/90">{line1}</p>
        <p className="text-sm leading-6 text-foreground/80">{line2}</p>
      </div>
    </section>
  );
}
