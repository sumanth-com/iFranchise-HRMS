"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  Sparkles,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/common/button";
import type { OnboardingCorrectionItem } from "@/lib/onboarding/onboarding-correction-utils";
import { ONBOARDING_STATUS_LABELS, type OnboardingStatus } from "@/types/onboarding";

export type OnboardingCelebrationMode =
  | "submitted"
  | "correction_required"
  | "correction_resubmitted";

type OnboardingSubmittedCelebrationProps = {
  fullName: string;
  status: OnboardingStatus;
  mode?: OnboardingCelebrationMode;
  correctionItems?: OnboardingCorrectionItem[];
  correctionNotes?: string | null;
  onFixCorrections?: () => void;
  onOpenCorrectionStep?: (stepIndex: number) => void;
};

const CONFETTI_COLORS = ["#10b981", "#2563eb", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

function ConfettiBurst() {
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${(i * 3.7 + 5) % 100}%`,
    delay: `${(i * 0.09) % 1.8}s`,
    duration: `${2.2 + (i % 4) * 0.35}s`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 5 + (i % 5) * 2,
    rotate: (i * 47) % 360,
  }));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
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

const REVIEW_TIMELINE = [
  {
    icon: CheckCircle2,
    title: "Submission received",
    description: "Your documents and details are securely stored.",
  },
  {
    icon: Clock,
    title: "HR review in progress",
    description: "Our HR team will verify your information and update you soon.",
  },
  {
    icon: Mail,
    title: "Next steps by email",
    description: "You'll hear from HR about account activation and joining moves.",
  },
];

export function OnboardingSubmittedCelebration({
  fullName,
  status,
  mode = "submitted",
  correctionItems = [],
  correctionNotes,
  onFixCorrections,
  onOpenCorrectionStep,
}: OnboardingSubmittedCelebrationProps) {
  const [stage, setStage] = useState(0);
  const isCorrectionRequired = mode === "correction_required";

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 80),
      setTimeout(() => setStage(2), 400),
      setTimeout(() => setStage(3), 700),
      setTimeout(() => setStage(4), 1000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const firstName = fullName.trim().split(/\s+/)[0] ?? "there";
  const statusLabel = ONBOARDING_STATUS_LABELS[status] ?? status;

  const headerBadge = isCorrectionRequired
    ? "Correction required"
    : mode === "correction_resubmitted"
      ? "Correction submitted"
      : "Onboarding complete";

  const title = isCorrectionRequired
    ? `${firstName}, HR needs a few fixes`
    : mode === "correction_resubmitted"
      ? `Thanks, ${firstName}!`
      : `Congratulations, ${firstName}!`;

  const description = isCorrectionRequired
    ? "HR reviewed your onboarding and requested updates to specific documents or sections. Review the items below, fix them, and resubmit for review."
    : mode === "correction_resubmitted"
      ? "Your corrected onboarding has been resubmitted. Our HR team will review the updates and contact you about the next steps."
      : "You've successfully submitted your pre-joining onboarding. Our HR team will review your details and update you on the next steps.";

  const progressLabel =
    isCorrectionRequired ? "Action needed" : mode === "correction_resubmitted" ? "Resubmitted" : "100% submitted";

  const progressValueClass = isCorrectionRequired
    ? "text-amber-700 dark:text-amber-300"
    : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div
        className={
          isCorrectionRequired
            ? "relative overflow-hidden rounded-3xl border border-amber-500/30 bg-card p-8 shadow-2xl shadow-black/20 ring-1 ring-border sm:p-10 dark:border-amber-400/25"
            : "relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-card p-8 shadow-2xl shadow-black/20 ring-1 ring-border sm:p-10 dark:border-emerald-400/20"
        }
      >
        {!isCorrectionRequired ? <ConfettiBurst /> : null}
        <div
          className={
            isCorrectionRequired
              ? "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl"
              : "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl"
          }
        />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative space-y-8">
          <div
            className={`text-center transition-all duration-700 ease-out ${
              stage >= 1 ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div
              className={
                isCorrectionRequired
                  ? "mx-auto mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-amber-500/15 ring-8 ring-amber-500/10"
                  : "mx-auto mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-emerald-500/15 ring-8 ring-emerald-500/10 onboarding-check-pop"
              }
            >
              {isCorrectionRequired ? (
                <AlertCircle
                  className="h-9 w-9 text-amber-600 dark:text-amber-400"
                  strokeWidth={2.25}
                />
              ) : (
                <CheckCircle2
                  className="h-9 w-9 text-emerald-600 dark:text-emerald-400"
                  strokeWidth={2.25}
                />
              )}
            </div>
            <div
              className={
                isCorrectionRequired
                  ? "mb-3 flex items-center justify-center gap-2 text-amber-800 dark:text-amber-300"
                  : "mb-3 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400"
              }
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">{headerBadge}</span>
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>

          <div
            className={`grid gap-3 transition-all duration-700 delay-100 ease-out sm:grid-cols-2 ${
              stage >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-border bg-card/90 p-4 text-center backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Status
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{statusLabel}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/90 p-4 text-center backdrop-blur-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Progress
              </p>
              <p className={`mt-1 text-sm font-semibold ${progressValueClass}`}>{progressLabel}</p>
            </div>
          </div>

          {isCorrectionRequired ? (
            <div
              className={`space-y-3 transition-all duration-700 delay-200 ease-out ${
                stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Items to fix
              </p>
              {correctionNotes ? (
                <p className="rounded-2xl border border-amber-300/60 bg-amber-50/80 px-4 py-3 text-xs leading-relaxed text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
                  <strong className="font-semibold">HR note:</strong> {correctionNotes}
                </p>
              ) : null}
              {correctionItems.map((item) => (
                <button
                  key={item.documentId}
                  type="button"
                  onClick={() => onOpenCorrectionStep?.(item.stepIndex)}
                  className="flex w-full gap-4 rounded-2xl border border-amber-300/50 bg-card/80 p-4 text-left backdrop-blur-sm transition-colors hover:border-amber-500/60 hover:bg-amber-50/50 dark:border-amber-500/30 dark:hover:bg-amber-950/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60">
                    <Wrench className="h-5 w-5 text-amber-700 dark:text-amber-300" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.documentLabel}</p>
                    <p className="text-xs text-muted-foreground">{item.sectionLabel}</p>
                    {item.hrComment ? (
                      <p className="mt-1 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
                        {item.hrComment}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Please upload a clear, valid replacement.
                      </p>
                    )}
                  </div>
                </button>
              ))}
              <div className="flex justify-center pt-1">
                <Button type="button" className="gap-2" onClick={onFixCorrections}>
                  <Wrench className="size-4" />
                  Fix & Resubmit
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`space-y-3 transition-all duration-700 delay-200 ease-out ${
                stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            >
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                What happens next
              </p>
              {REVIEW_TIMELINE.map((item, index) => (
                <div
                  key={item.title}
                  className={`flex gap-4 rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm transition-all duration-500 ${
                    stage >= 3 ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
                  }`}
                  style={{ transitionDelay: `${index * 120 + 200}ms` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <item.icon className="h-5 w-5 text-foreground/70" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p
            className={`text-center text-xs text-muted-foreground transition-all duration-700 delay-300 ${
              stage >= 4 ? "opacity-100" : "opacity-0"
            }`}
          >
            {isCorrectionRequired
              ? "Open each item above or use Fix & Resubmit to update your onboarding."
              : "Our HR team will update you by email. You can close this window for now."}
          </p>
        </div>
      </div>
    </div>
  );
}
