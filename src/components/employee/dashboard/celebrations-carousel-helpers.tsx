"use client";

import { useEffect, useState } from "react";
import { Bell, CalendarDays, Info, Megaphone, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/** Soft premium confetti burst for birthday slides (CSS-only). */
export function BirthdayCelebrationBurst({ active }: { active: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      return;
    }
    setShow(true);
    const timer = window.setTimeout(() => setShow(false), 1700);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!show) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 14 }).map((_, index) => (
        <span
          key={`${active}-${index}`}
          className={cn(
            "birthday-celebration-particle absolute top-[36%] left-1/2 size-1.5 rounded-full",
            index % 3 === 0
              ? "bg-violet-400/80"
              : index % 3 === 1
                ? "bg-amber-300/80"
                : "bg-rose-300/70",
          )}
          style={{
            ["--tx" as string]: `${((index % 7) - 3) * 18}px`,
            ["--ty" as string]: `${-28 - (index % 5) * 10}px`,
            animationDelay: `${index * 40}ms`,
          }}
        />
      ))}
    </div>
  );
}

const ICON_MAP = {
  megaphone: Megaphone,
  bell: Bell,
  sparkles: Sparkles,
  info: Info,
  calendar: CalendarDays,
} as const;

export function AnnouncementIcon({
  iconKey,
  className,
}: {
  iconKey?: string | null;
  className?: string;
}) {
  const Icon =
    iconKey && iconKey in ICON_MAP
      ? ICON_MAP[iconKey as keyof typeof ICON_MAP]
      : Megaphone;
  return <Icon className={className} />;
}

export function useCelebrationsCarousel(slideCount: number, intervalMs = 5500) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setIndex(0);
  }, [slideCount]);

  useEffect(() => {
    if (slideCount <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slideCount);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [slideCount, paused, intervalMs]);

  return {
    index,
    setIndex,
    paused,
    setPaused,
    goTo: (next: number) => setIndex(next),
  };
}
