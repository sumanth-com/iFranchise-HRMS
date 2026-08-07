"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PartyPopper } from "lucide-react";

import { cn } from "@/lib/utils";

const CONFETTI_COLORS = ["#10b981", "#2563eb", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

const CELEBRATION_STYLES = `
@keyframes offer-tick-pop {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes offer-tick-draw {
  to { stroke-dashoffset: 0; }
}
.offer-tick-circle {
  animation: offer-tick-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transform: scale(0);
}
.offer-tick-ring {
  stroke-dasharray: 188;
  stroke-dashoffset: 188;
  animation: offer-tick-draw 0.55s ease forwards;
}
.offer-tick-check {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: offer-tick-draw 0.35s ease 0.35s forwards;
}
`;

function ConfettiBurst() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: `${(i * 4.2 + 3) % 100}%`,
    delay: `${(i * 0.08) % 1.6}s`,
    duration: `${2 + (i % 4) * 0.3}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 5 + (i % 4) * 2,
    rotate: (i * 51) % 360,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {particles.map((p) => (
        <span
          key={p.id}
          className="onboarding-confetti absolute -top-2 rounded-[2px] opacity-0"
          style={{
            left: p.left,
            width: p.size,
            height: p.size * 1.5,
            backgroundColor: p.color,
            animationDelay: p.delay,
            animationDuration: p.duration,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}

type OfferStageCelebrationProps = {
  open: boolean;
  candidateName: string;
  onClose?: () => void;
};

export function OfferStageCelebration({
  open,
  candidateName,
  onClose,
}: OfferStageCelebrationProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

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
    const durationMs = 3200;
    const exitTimer = window.setTimeout(() => setExiting(true), durationMs - 320);
    const closeTimer = window.setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, durationMs);

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(closeTimer);
    };
  }, [open, onClose]);

  if (!mounted || !visible) return null;

  return createPortal(
    <>
      <style dangerouslySetInnerHTML={{ __html: CELEBRATION_STYLES }} />
      <div
        className={cn(
          "fixed inset-0 z-[200] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px] transition-opacity duration-300",
          exiting ? "opacity-0" : "opacity-100",
        )}
        role="status"
        aria-live="polite"
      >
        <div
          className={cn(
            "relative flex w-full max-w-sm flex-col items-center rounded-2xl border bg-card px-6 py-8 text-center shadow-2xl transition-all duration-300",
            exiting ? "scale-95 opacity-0" : "scale-100 opacity-100",
          )}
        >
          <ConfettiBurst />
          <div className="relative mb-4 flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <PartyPopper className="size-8" />
          </div>
          <div className="relative mb-4 flex size-20 items-center justify-center text-emerald-500">
            <span className="offer-tick-circle absolute inset-0 rounded-full bg-emerald-500/15" />
            <svg className="size-20" viewBox="0 0 72 72" fill="none" aria-hidden="true">
              <circle
                className="offer-tick-ring"
                cx="36"
                cy="36"
                r="30"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="offer-tick-check"
                d="M22 37.5 31.5 47 50 28.5"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold tracking-tight">Offer stage reached!</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {candidateName} is at the offer stage. Send the offer letter from the hub below when
            ready.
          </p>
        </div>
      </div>
    </>,
    document.body,
  );
}
