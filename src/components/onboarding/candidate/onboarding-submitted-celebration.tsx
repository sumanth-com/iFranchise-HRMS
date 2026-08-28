"use client";

import { CheckCircle2, Clock, Mail, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { ONBOARDING_STATUS_LABELS, type OnboardingStatus } from "@/types/onboarding";

type OnboardingSubmittedCelebrationProps = {
  fullName: string;
  status: OnboardingStatus;
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

const TIMELINE = [
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
}: OnboardingSubmittedCelebrationProps) {
  const [stage, setStage] = useState(0);

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

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-card p-8 shadow-2xl shadow-black/20 ring-1 ring-border sm:p-10 dark:border-emerald-400/20">
        <ConfettiBurst />
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative space-y-8">
          <div
            className={`text-center transition-all duration-700 ease-out ${
              stage >= 1 ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            <div className="mx-auto mb-5 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-emerald-500/15 ring-8 ring-emerald-500/10 onboarding-check-pop">
              <CheckCircle2 className="h-9 w-9 text-emerald-600 dark:text-emerald-400" strokeWidth={2.25} />
            </div>
            <div className="mb-3 flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                Onboarding complete
              </span>
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Congratulations, {firstName}!
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              You&apos;ve successfully submitted your pre-joining onboarding. Our HR team will
              review your details and update you on the next steps.
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
              <p className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                100% submitted
              </p>
            </div>
          </div>

          <div
            className={`space-y-3 transition-all duration-700 delay-200 ease-out ${
              stage >= 3 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <p className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What happens next
            </p>
            {TIMELINE.map((item, index) => (
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

          <p
            className={`text-center text-xs text-muted-foreground transition-all duration-700 delay-300 ${
              stage >= 4 ? "opacity-100" : "opacity-0"
            }`}
          >
            Our HR team will update you by email. You can close this window for now.
          </p>
        </div>
      </div>
    </div>
  );
}
