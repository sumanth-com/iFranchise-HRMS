"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";

import {
  resolveDailyBoostMessage,
  type DailyBoostTone,
} from "@/lib/dashboard/daily-boost-messages";
import { getDailyBoostDisplayName } from "@/lib/employees/parse-employee-name";
import { cn } from "@/lib/utils";

type DailyBoostCardProps = {
  firstName?: string;
  lastName?: string;
  personKey?: string;
  referenceDate?: string;
  className?: string;
  compact?: boolean;
  tone?: DailyBoostTone;
};

export function DailyBoostCard({
  firstName,
  lastName,
  personKey,
  referenceDate,
  className,
  compact = false,
  tone = "team",
}: DailyBoostCardProps) {
  const name = getDailyBoostDisplayName(firstName ?? "", lastName ?? "");
  const dayKey = referenceDate?.trim() || format(new Date(), "yyyy-MM-dd");
  const message = resolveDailyBoostMessage({
    tone,
    referenceDate: dayKey,
    personKey: personKey ?? name,
    name,
  });

  return (
    <section
      aria-label="Daily message"
      className={cn(
        "daily-boost-card relative isolate min-w-0 overflow-hidden rounded-2xl border border-violet-200/70",
        compact ? "min-h-[11rem]" : "min-h-[13rem]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[46%] sm:w-[44%]">
        <Image
          src="/images/auth-team-brand-cutout.webp"
          alt=""
          fill
          sizes="(min-width: 1024px) 24vw, 48vw"
          className="object-contain object-bottom"
          aria-hidden
        />
      </div>

      <div
        className={cn(
          "absolute inset-0 z-10 flex items-center",
          compact ? "p-4 sm:p-5" : "p-5 sm:p-6",
        )}
      >
        <div className="w-1/2 min-w-0 max-w-[40rem] rounded-2xl border border-white/80 bg-white/55 px-4 py-4 shadow-[0_10px_28px_-20px_rgba(67,46,137,0.45)] ring-1 ring-violet-200/35 backdrop-blur-sm dark:border-white/10 dark:bg-slate-950/25 dark:ring-white/10 sm:px-5 sm:py-5">
          <p className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-200">
            <Sparkles className="size-3.5" aria-hidden />
            A little inspiration
          </p>
          <blockquote
            className={cn(
              "text-left font-semibold text-pretty text-slate-900 dark:text-white",
              compact
                ? "text-sm leading-snug sm:text-[15px]"
                : "text-base leading-snug sm:text-lg",
            )}
          >
            <p className="line-clamp-2">
              <span aria-hidden className="mr-1 font-serif text-violet-500/70">
                &ldquo;
              </span>
              {message.line1}
            </p>
            <p className="mt-1 line-clamp-2 text-slate-700 dark:text-white/85">
              {message.line2}
              <span aria-hidden className="ml-0.5 font-serif text-violet-500/70">
                &rdquo;
              </span>
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
