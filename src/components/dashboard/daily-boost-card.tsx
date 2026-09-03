"use client";

import Image from "next/image";
import { format } from "date-fns";

import dashArt from "@/assets/Dash.png";
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
        "relative overflow-hidden rounded-2xl",
        compact ? "min-h-[7.5rem]" : "min-h-[11rem] max-xl:min-h-0",
        className,
      )}
    >
      <div className="absolute inset-0 hidden xl:block">
        <Image
          src={dashArt}
          alt=""
          fill
          sizes="55vw"
          className="object-cover object-[center_28%]"
          priority={false}
          aria-hidden
        />
      </div>
      <Image
        src={dashArt}
        alt=""
        width={1920}
        height={720}
        sizes="100vw"
        className="block h-[13.5rem] w-full object-cover object-[86%_42%] xl:hidden"
        priority={false}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#12082a]/55 via-[#12082a]/15 to-transparent max-xl:from-[#12082a]/52 max-xl:via-[#12082a]/10 max-xl:to-transparent"
        aria-hidden
      />

      <div
        className={cn(
          "relative z-10 flex items-start max-xl:absolute max-xl:inset-0",
          compact ? "p-3 pt-3.5" : "p-5 pt-5 sm:p-6 sm:pt-6 xl:h-full",
        )}
      >
        <div
          className={cn(
            "w-full max-w-[24rem] rounded-2xl bg-[#0b0618]/45 shadow-[0_12px_32px_-16px_rgba(8,4,24,0.7)] ring-1 ring-white/18 backdrop-blur-md max-xl:max-w-[min(50%,20.5rem)]",
            compact ? "px-3.5 py-3" : "px-4 py-3.5 sm:px-5 sm:py-4",
          )}
        >
          <blockquote
            className={cn(
              "text-left font-medium text-pretty text-white",
              compact
                ? "text-[12px] leading-snug"
                : "text-sm leading-snug sm:text-[15px] sm:leading-snug",
            )}
          >
            <p className="line-clamp-1 max-xl:line-clamp-2">
              <span aria-hidden className="mr-1 font-serif text-white/50">
                &ldquo;
              </span>
              {message.line1}
            </p>
            <p className="mt-1 line-clamp-1 text-white/92 max-xl:line-clamp-2">
              {message.line2}
              <span aria-hidden className="ml-0.5 font-serif text-white/50">
                &rdquo;
              </span>
            </p>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
