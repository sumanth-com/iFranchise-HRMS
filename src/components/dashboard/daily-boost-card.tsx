"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";

import dashArt from "@/assets/Dash.png";
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
        "relative overflow-hidden rounded-2xl",
        compact ? "min-h-[7.5rem]" : "min-h-0",
        className,
      )}
    >
      <Image
        src={dashArt}
        alt=""
        fill
        sizes="(max-width: 1024px) 100vw, 55vw"
        className="object-cover object-center"
        priority={false}
        aria-hidden
      />

      <div
        className={cn(
          "relative z-10 flex h-full items-center",
          compact ? "p-3" : "p-5 sm:p-6",
        )}
      >
        <div
          className={cn(
            "w-full max-w-[20rem] rounded-xl bg-white/12 shadow-[0_10px_28px_-14px_rgba(15,8,40,0.55)] ring-1 ring-white/22 backdrop-blur-md",
            compact ? "px-3 py-2.5" : "px-4 py-3.5 sm:px-5 sm:py-4",
          )}
        >
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
              "mt-2.5 text-left font-medium text-pretty text-white",
              compact
                ? "text-[12px] leading-relaxed"
                : "text-sm leading-relaxed sm:text-[15px] sm:leading-snug",
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
        </div>
      </div>
    </section>
  );
}
