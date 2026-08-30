"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import brandLogo from "@/assets/Logo.png";
import desktopExperienceIllustration from "@/assets/get.png";

type LandingDesktopExperienceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function LandingDesktopExperience({
  open,
  onOpenChange,
}: LandingDesktopExperienceProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="landing-desktop-experience gap-0 overflow-hidden border-0 p-0 sm:max-w-md"
      >
        <div className="landing-desktop-experience-aurora" aria-hidden />

        <div className="landing-desktop-experience-body relative flex min-h-0 flex-col px-4 pb-4 pt-3 sm:px-6 sm:pb-7 sm:pt-6">
          <div className="flex shrink-0 items-center justify-center gap-2.5">
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

          <div className="landing-desktop-experience-illustration">
            <Image
              src={desktopExperienceIllustration}
              alt=""
              width={836}
              height={470}
              priority
              className="landing-desktop-experience-illustration-img"
            />
          </div>

          <div className="mt-2 flex shrink-0 items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 sm:mt-5">
            <Sparkles className="size-3.5" strokeWidth={2.4} aria-hidden />
            Built for desktop
          </div>

          <DialogTitle className="mt-2 shrink-0 text-center text-xl font-bold tracking-tight text-slate-900 text-balance sm:mt-3 sm:text-2xl">
            Your full HRMS, ready on desktop
          </DialogTitle>
          <DialogDescription className="landing-desktop-experience-desc mt-1.5 shrink-0 text-center text-sm leading-relaxed text-slate-600 text-pretty sm:mt-2">
            Browse iFranchise here, then continue on a larger screen for the complete workspace —
            dashboards, approvals, and day-to-day HR workflows.
          </DialogDescription>

          <div className="mt-4 shrink-0 sm:mt-6">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="landing-desktop-experience-primary h-11 w-full rounded-full text-sm font-semibold"
            >
              Back to home
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
