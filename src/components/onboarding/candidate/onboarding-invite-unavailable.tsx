import Link from "next/link";
import { AlertCircle, KeyRound, LogIn, Mail } from "lucide-react";

import { ONBOARDING_ROUTES } from "@/types/onboarding";

type OnboardingInviteUnavailableProps = {
  reason: string;
};

function resolveUnavailableContent(reason: string) {
  const normalized = reason.toLowerCase();

  if (normalized.includes("already been used") || normalized.includes("no longer active")) {
    return {
      title: "Invitation link already used",
      description:
        "You have already set up your onboarding password. Sign in with your personal email and password to continue where you left off.",
      showLogin: true,
      hint: "Use the same personal email address that received this invitation.",
    };
  }

  if (normalized.includes("expired")) {
    return {
      title: "Invitation link expired",
      description:
        "This secure link has expired for your protection. Contact your HR team to request a new onboarding invitation.",
      showLogin: true,
      hint: "If you already created your password before the link expired, you can still sign in below.",
    };
  }

  if (normalized.includes("cancelled") || normalized.includes("archived")) {
    return {
      title: "Onboarding not available",
      description: reason,
      showLogin: false,
      hint: "Please reach out to your HR administrator for assistance.",
    };
  }

  return {
    title: "Invitation unavailable",
    description: reason,
    showLogin: true,
    hint: "If you previously completed account setup, sign in to access the onboarding portal.",
  };
}

export function OnboardingInviteUnavailable({ reason }: OnboardingInviteUnavailableProps) {
  const content = resolveUnavailableContent(reason);

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl shadow-slate-900/[0.06] ring-1 ring-black/[0.03]">
      <div className="border-b border-border/50 bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-8 text-center text-white">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
          <AlertCircle className="h-5 w-5" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{content.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/75">
          {content.description}
        </p>
      </div>

      <div className="space-y-5 px-6 py-7 text-center">
        <p className="text-sm leading-relaxed text-muted-foreground">{content.hint}</p>

        {content.showLogin ? (
          <div className="space-y-3">
            <Link
              href={ONBOARDING_ROUTES.login}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign in to onboarding portal
            </Link>
            <div className="rounded-xl border bg-slate-50/90 p-4 text-left">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Already have a password?</p>
                  <p>Use your personal email and the password you created during setup.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-slate-50/90 p-4">
            <div className="flex items-start gap-3 text-left">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Contact your HR team if you believe this is an error or need a new invitation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
