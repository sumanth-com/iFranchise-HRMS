"use client";

import { Label } from "@/components/ui/label";
import { ONBOARDING_TERMS_BLOCKS } from "@/lib/onboarding/onboarding-terms-content";
import { cn } from "@/lib/utils";

type OnboardingTermsSectionProps = {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
};

export function OnboardingTermsSection({
  accepted,
  onAcceptedChange,
}: OnboardingTermsSectionProps) {
  return (
    <div className="mx-auto min-w-0 max-w-3xl space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Please read the policies and terms below. Check the box at the end to confirm and continue.
      </p>

      <div
        className={cn(
          "max-h-[min(52vh,28rem)] overflow-y-auto rounded-xl border border-border bg-muted/15 p-4 sm:p-5",
          "[-ms-overflow-style:auto] [scrollbar-width:thin]",
        )}
      >
        <div className="space-y-5 text-sm leading-relaxed text-foreground">
          {ONBOARDING_TERMS_BLOCKS.map((block) => (
            <section key={block.title} className="space-y-2">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                {block.title}
              </h3>
              {block.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-4 text-sm transition-colors hover:bg-muted/30">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
        />
        <span>
          <Label className="cursor-pointer text-sm font-medium text-foreground">
            I have read and agree to the company policies, terms & conditions
            <span className="text-foreground"> *</span>
          </Label>
          <span className="mt-1 block text-xs text-muted-foreground">
            This confirms your acknowledgement of employment, workplace, privacy, and related
            policies required to complete onboarding.
          </span>
        </span>
      </label>
    </div>
  );
}
