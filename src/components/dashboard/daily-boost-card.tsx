"use client";

import Image from "next/image";

import dashboardImg from "@/assets/dashboard.png";
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
      aria-label="Workspace"
      className={cn(
        "dashboard-surface relative flex overflow-hidden rounded-2xl border-0 bg-white dark:bg-card",
        compact ? "min-h-[7.5rem]" : "min-h-[16rem]",
        className,
      )}
    >
      <Image
        src={dashboardImg}
        alt="iFranchise workspace"
        fill
        priority
        quality={100}
        sizes="(max-width: 1024px) 100vw, 55vw"
        className="object-contain object-right"
      />

      <div
        className={cn(
          "relative z-10 flex h-full items-center",
          compact ? "p-3" : "p-4 sm:p-5 lg:p-6",
        )}
      >
        <blockquote
          className={cn(
            "w-fit max-w-[min(20rem,38%)] rounded-2xl border border-slate-200/80 bg-white/85 text-left shadow-[0_10px_28px_rgba(15,23,42,0.08),0_1px_4px_rgba(15,23,42,0.04)] backdrop-blur-md dark:border-white/15 dark:bg-slate-900/85",
            compact ? "px-3.5 py-2.5" : "px-4 py-3.5 sm:px-4.5 sm:py-4",
          )}
        >
          <p
            className={cn(
              "font-sans font-medium not-italic leading-relaxed text-pretty text-slate-800 dark:text-slate-100",
              compact ? "text-xs" : "text-xs sm:text-[13.5px] lg:text-[14px]",
            )}
          >
            <span aria-hidden className="mr-0.5 font-serif text-base text-[#5f55ee]">
              “
            </span>
            {message}
            <span aria-hidden className="ml-0.5 font-serif text-base text-[#5f55ee]">
              ”
            </span>
          </p>
        </blockquote>
      </div>
    </section>
  );
}
