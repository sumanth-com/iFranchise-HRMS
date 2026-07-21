"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const OVERLAY_STYLES = `
@keyframes success-tick-pop {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes success-tick-draw {
  to { stroke-dashoffset: 0; }
}
.success-tick-circle {
  animation: success-tick-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  transform: scale(0);
}
.success-tick-ring {
  stroke-dasharray: 188;
  stroke-dashoffset: 188;
  animation: success-tick-draw 0.55s ease forwards;
}
.success-tick-check {
  stroke-dasharray: 48;
  stroke-dashoffset: 48;
  animation: success-tick-draw 0.35s ease 0.35s forwards;
}
`;

type SuccessCelebrationOverlayProps = {
  open: boolean;
  title: string;
  description?: string;
  durationMs?: number;
  onClose?: () => void;
};

export function SuccessCelebrationOverlay({
  open,
  title,
  description,
  durationMs = 3000,
  onClose,
}: SuccessCelebrationOverlayProps) {
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
    const exitTimer = window.setTimeout(() => setExiting(true), durationMs - 320);
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
      <style dangerouslySetInnerHTML={{ __html: OVERLAY_STYLES }} />
      <div
        className={cn(
          "fixed inset-0 z-[200] flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px] transition-opacity duration-300",
          exiting ? "opacity-0" : "opacity-100",
        )}
        role="status"
        aria-live="polite"
        aria-label={title}
      >
        <div
          className={cn(
            "flex w-full max-w-xs flex-col items-center rounded-2xl border bg-card px-6 py-8 text-center shadow-2xl transition-all duration-300",
            exiting ? "scale-95 opacity-0" : "scale-100 opacity-100",
          )}
        >
          <div className="relative mb-5 flex size-20 items-center justify-center text-emerald-500">
            <span className="success-tick-circle absolute inset-0 rounded-full bg-emerald-500/15" />
            <svg className="size-20" viewBox="0 0 72 72" fill="none" aria-hidden="true">
              <circle
                className="success-tick-ring"
                cx="36"
                cy="36"
                r="30"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="success-tick-check"
                d="M22 37.5 31.5 47 50 28.5"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <p className="text-lg font-semibold tracking-tight text-foreground">{title}</p>
          {description ? (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
    </>,
    document.body,
  );
}
