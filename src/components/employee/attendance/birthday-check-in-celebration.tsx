"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Cake } from "lucide-react";

import { cn } from "@/lib/utils";

const CELEBRATION_STYLES = `
@keyframes birthday-portal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes birthday-portal-card-in {
  0% { opacity: 0; transform: translateY(10px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes birthday-corner-burst {
  0% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0.4) rotate(0deg); }
  18% { opacity: 0.9; }
  100% { opacity: 0; transform: translate(var(--ex), var(--ey)) scale(1) rotate(160deg); }
}
.birthday-portal-fade {
  animation: birthday-portal-fade-in 0.35s ease forwards;
}
.birthday-portal-card {
  animation: birthday-portal-card-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.birthday-corner-particle {
  animation: birthday-corner-burst 2.4s ease-out forwards;
}
@media (prefers-reduced-motion: reduce) {
  .birthday-portal-fade,
  .birthday-portal-card,
  .birthday-corner-particle {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`;

const PARTICLE_COLORS = [
  "bg-violet-400/80",
  "bg-rose-300/80",
  "bg-amber-300/85",
  "bg-sky-300/80",
  "bg-fuchsia-300/75",
  "bg-emerald-300/70",
];

type Corner = "tl" | "tr" | "bl" | "br";

function cornerVectors(corner: Corner, index: number) {
  const spread = 40 + (index % 5) * 18;
  const rise = 28 + (index % 4) * 22;
  switch (corner) {
    case "tl":
      return { sx: "0px", sy: "0px", ex: `${spread}px`, ey: `${rise}px` };
    case "tr":
      return { sx: "0px", sy: "0px", ex: `${-spread}px`, ey: `${rise}px` };
    case "bl":
      return { sx: "0px", sy: "0px", ex: `${spread}px`, ey: `${-rise}px` };
    case "br":
      return { sx: "0px", sy: "0px", ex: `${-spread}px`, ey: `${-rise}px` };
  }
}

function CornerBurst({ corner }: { corner: Corner }) {
  const position =
    corner === "tl"
      ? "left-3 top-3"
      : corner === "tr"
        ? "right-3 top-3"
        : corner === "bl"
          ? "bottom-3 left-3"
          : "bottom-3 right-3";

  return (
    <div className={cn("pointer-events-none absolute", position)} aria-hidden>
      {Array.from({ length: 8 }).map((_, index) => {
        const vectors = cornerVectors(corner, index);
        return (
          <span
            key={`${corner}-${index}`}
            className={cn(
              "birthday-corner-particle absolute size-1.5 rounded-full",
              PARTICLE_COLORS[index % PARTICLE_COLORS.length],
            )}
            style={{
              ["--sx" as string]: vectors.sx,
              ["--sy" as string]: vectors.sy,
              ["--ex" as string]: vectors.ex,
              ["--ey" as string]: vectors.ey,
              animationDelay: `${index * 55}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

type Props = {
  open: boolean;
  firstName: string;
  durationMs?: number;
  onClose?: () => void;
};

/**
 * Non-blocking birthday greeting after check-in.
 * Corner particles + centered card; auto-dismisses.
 */
export function BirthdayCheckInCelebration({
  open,
  firstName,
  durationMs = 4200,
  onClose,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const name = firstName.trim() || "there";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      setExiting(false);
      return;
    }

    setExiting(false);
    setVisible(true);
    const exitTimer = window.setTimeout(() => setExiting(true), Math.max(800, durationMs - 360));
    const closeTimer = window.setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, durationMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(closeTimer);
    };
  }, [open, durationMs, onClose]);

  if (!mounted || !visible) return null;

  return createPortal(
    <>
      <style dangerouslySetInnerHTML={{ __html: CELEBRATION_STYLES }} />
      <div
        className={cn(
          "birthday-portal-fade pointer-events-none fixed inset-0 z-[210]",
          exiting ? "opacity-0 transition-opacity duration-300" : "opacity-100",
        )}
        role="status"
        aria-live="polite"
        aria-label={`Happy Birthday, ${name}`}
      >
        <CornerBurst corner="tl" />
        <CornerBurst corner="tr" />
        <CornerBurst corner="bl" />
        <CornerBurst corner="br" />

        <div className="flex h-full items-center justify-center p-4">
          <div
            className={cn(
              "birthday-portal-card w-full max-w-sm rounded-2xl border border-rose-500/20 bg-card/95 px-6 py-7 text-center shadow-2xl backdrop-blur-sm ring-1 ring-rose-500/15",
              exiting ? "scale-95 opacity-0 transition-all duration-300" : "scale-100 opacity-100",
            )}
          >
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/20 to-violet-500/15 text-rose-600 ring-1 ring-rose-500/20 dark:text-rose-300">
              <Cake className="size-6" />
            </span>
            <p className="mt-4 text-lg font-semibold tracking-tight text-foreground">
              Happy Birthday, {name}! 🎉
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Wishing you a fantastic year ahead!
            </p>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
