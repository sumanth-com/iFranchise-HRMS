"use client";

import { CalendarDays, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { OnboardingWizard } from "@/components/onboarding/candidate/onboarding-wizard";
import { getCandidatePortalContextAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";
import type { CandidatePortalContext } from "@/types/onboarding";

function formatJoiningDate(value: string | null) {
  if (!value) return "To be confirmed";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OnboardingPortalPage() {
  const router = useRouter();
  const [context, setContext] = useState<CandidatePortalContext | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    const data = await getCandidatePortalContextAction();
    setContext(data);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (context === null) {
      router.replace("/onboarding/login");
    }
  }, [context, router]);

  if (context === undefined) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading your onboarding portal…</p>
      </div>
    );
  }

  if (!context) {
    return null;
  }

  const isSubmitted = context.locked;

  return (
    <div className="space-y-6">
      {!isSubmitted ? (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-lg shadow-slate-900/[0.04] ring-1 ring-black/[0.03]">
          <div className="border-b border-border/50 bg-gradient-to-r from-slate-900 to-slate-800 px-5 py-6 text-white sm:px-8 sm:py-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
              Welcome aboard
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {context.fullName}
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              Complete each section in order. Your progress is saved automatically as you go.
            </p>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
            <div className="flex items-center gap-3 rounded-xl border bg-slate-50/80 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <CalendarDays className="h-5 w-5 text-slate-600" strokeWidth={2} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Joining date
                </p>
                <p className="mt-0.5 text-sm font-semibold">
                  {formatJoiningDate(context.joiningDate)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-slate-50/80 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                <TrendingUp className="h-5 w-5 text-slate-600" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overall progress
                </p>
                <div className="mt-1.5 flex items-center gap-3">
                  <p className="text-sm font-semibold tabular-nums">{context.completionPercent}%</p>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                      style={{ width: `${context.completionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {context.correctionNotes ? (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
          <strong>HR requested corrections:</strong> {context.correctionNotes}
        </div>
      ) : null}

      <OnboardingWizard context={context} onRefresh={refresh} />
    </div>
  );
}
