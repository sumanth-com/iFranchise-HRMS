"use client";

import { Sparkles } from "lucide-react";

import {
  resolveDailyBoostLine,
  type DailyBoostTone,
} from "@/lib/dashboard/daily-boost-messages";
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

function givenName(firstName?: string) {
  const parts = firstName?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.at(-1) || "there";
}

export function DailyBoostCard({
  firstName,
  personKey,
  referenceDate,
  className,
  compact = false,
  tone = "team",
}: DailyBoostCardProps) {
  const name = givenName(firstName);
  const message = resolveDailyBoostLine({
    tone,
    referenceDate: referenceDate ?? "",
    personKey: personKey ?? name,
    name,
  });

  return (
    <section
      aria-label="Daily boost"
      className={cn(
        "daily-boost-card relative flex flex-col justify-center overflow-hidden rounded-2xl",
        compact ? "min-h-[7.5rem] p-4" : "min-h-[16rem] p-5 sm:p-6 lg:p-7",
        className,
      )}
    >
      <div className="daily-boost-glow daily-boost-glow--a" aria-hidden />
      <div className="daily-boost-glow daily-boost-glow--b" aria-hidden />

      <div className="relative z-10 flex flex-col items-start">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-white/15 font-semibold tracking-wide text-white uppercase ring-1 ring-white/25",
            compact ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]",
          )}
        >
          <Sparkles className={compact ? "size-3" : "size-3.5"} strokeWidth={2.4} aria-hidden />
          Daily boost
        </span>

        <blockquote
          className={cn(
            "mt-3 max-w-[34rem] text-left font-medium text-pretty text-white",
            compact
              ? "text-[13px] leading-relaxed"
              : "text-base leading-relaxed sm:text-lg sm:leading-relaxed lg:text-[1.35rem] lg:leading-snug",
          )}
        >
          <span aria-hidden className="mr-1 font-serif text-white/55">
            &ldquo;
          </span>
          {message}
          <span aria-hidden className="ml-0.5 font-serif text-white/55">
            &rdquo;
          </span>
        </blockquote>

        <span
          className={cn(
            "mt-4 block rounded-full bg-white/35",
            compact ? "h-0.5 w-8" : "h-1 w-12",
          )}
          aria-hidden
        />
      </div>
    </section>
  );
}
