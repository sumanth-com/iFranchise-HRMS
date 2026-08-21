"use client";

import Image from "next/image";

import {
  resolveDailyBoostLine,
  type DailyBoostTone,
} from "@/lib/dashboard/daily-boost-messages";
import { cn } from "@/lib/utils";

/** Compressed public asset (replaces ~1.5MB PNG import on every dashboard). */
const DASHBOARD_BOOST_IMAGE = "/images/dashboard-boost.jpg";

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
        "relative overflow-hidden rounded-2xl border bg-card shadow-sm",
        compact ? "min-h-[7.5rem]" : "min-h-[16rem]",
        className,
      )}
    >
      <Image
        src={DASHBOARD_BOOST_IMAGE}
        alt=""
        fill
        priority={false}
        quality={72}
        sizes="(max-width: 1024px) 100vw, 55vw"
        className="object-cover object-[70%_center]"
      />

      <div
        className={cn(
          "absolute inset-y-0 left-0 z-10 flex items-center",
          compact ? "p-3" : "p-4 sm:p-5",
        )}
      >
        <blockquote
          className={cn(
            "w-fit max-w-[min(22rem,52%)] rounded-2xl border border-white/50 bg-[linear-gradient(180deg,#fff8ea_0%,#f3e6c9_100%)] text-left shadow-[0_8px_28px_rgba(120,90,40,0.10),0_0_18px_rgba(255,248,232,0.55)]",
            compact ? "px-3.5 py-2.5" : "px-4 py-3.5",
          )}
        >
          <p
            className={cn(
              "font-sans font-medium not-italic leading-relaxed text-pretty text-[#4a3b28]",
              compact ? "text-sm" : "text-[15px] sm:text-base",
            )}
          >
            <span aria-hidden className="mr-0.5 text-[#b08950]">
              “
            </span>
            {message}
            <span aria-hidden className="ml-0.5 text-[#b08950]">
              ”
            </span>
          </p>
        </blockquote>
      </div>
    </section>
  );
}
