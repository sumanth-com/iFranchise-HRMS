"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";

import { LandingDesktopPreview } from "@/components/landing/landing-desktop-preview";
import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import brandLogo from "@/assets/Logo.png";

const RESET_DELAY_MS = 2600;

type LandingDesktopExperienceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LandingDesktopExperience({
  open,
  onOpenChange,
}: LandingDesktopExperienceProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const handleCopyLink = useCallback(async () => {
    const url = window.location.origin;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this link and open it on your computer:", url);
      return;
    }

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), RESET_DELAY_MS);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="landing-desktop-experience gap-0 overflow-hidden border-0 p-0 sm:max-w-md"
      >
        <div className="landing-desktop-experience-aurora" aria-hidden />

        <div className="relative px-5 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
          <div className="flex items-center justify-center gap-2.5">
            <span className="landing-desktop-experience-brand-mark">
              <Image
                src={brandLogo}
                alt=""
                width={32}
                height={32}
                className="size-8 object-contain"
              />
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              iFranchise
            </span>
          </div>

          <LandingDesktopPreview />

          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
            <Sparkles className="size-3.5" strokeWidth={2.4} aria-hidden />
            Built for desktop
          </div>

          <DialogTitle className="mt-3 text-center text-2xl font-bold tracking-tight text-slate-900 text-balance">
            Your full HRMS, ready on desktop
          </DialogTitle>
          <DialogDescription className="mt-2 text-center text-sm leading-relaxed text-slate-600 text-pretty">
            Browse iFranchise here, then continue on a larger screen for the complete workspace —
            dashboards, approvals, and day-to-day HR workflows.
          </DialogDescription>

          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="landing-desktop-experience-primary h-11 rounded-full text-sm font-semibold"
            >
              Back to home
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={handleCopyLink}
            >
              {copied ? (
                <Check className="size-4" strokeWidth={2.6} aria-hidden />
              ) : (
                <Copy className="size-4" strokeWidth={2.3} aria-hidden />
              )}
              {copied ? "Link copied" : "Copy Desktop Link"}
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-slate-500" aria-live="polite">
            {copied
              ? "Paste the link in your computer browser to continue."
              : "Optional: copy a link to open iFranchise on your computer."}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
