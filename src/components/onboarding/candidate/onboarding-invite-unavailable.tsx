import Link from "next/link";
import { Mail, ShieldAlert } from "lucide-react";

import { ONBOARDING_ROUTES } from "@/types/onboarding";
import { ONBOARDING_AUTH_SUBMIT_CLASS } from "@/components/onboarding/candidate/onboarding-auth-styles";
import { cn } from "@/lib/utils";

type OnboardingInviteUnavailableProps = {
  reason: string;
};

function resolveUnavailableContent(reason: string) {
  const normalized = reason.toLowerCase();

  if (normalized.includes("already been used") || normalized.includes("no longer active")) {
    return {
      title: "Invitation already used",
      description:
        "You already set up your onboarding password. Sign in with your personal email and password to continue.",
      showLogin: true,
    };
  }

  if (normalized.includes("expired")) {
    return {
      title: "Invitation link expired",
      description:
        "This link has expired. If you already created a password, you can still sign in. Otherwise ask HR for a new invitation.",
      showLogin: true,
    };
  }

  if (normalized.includes("cancelled") || normalized.includes("archived")) {
    return {
      title: "Onboarding not available",
      description: reason,
      showLogin: false,
    };
  }

  return {
    title: "Invitation unavailable",
    description: reason,
    showLogin: true,
  };
}

export function OnboardingInviteUnavailable({ reason }: OnboardingInviteUnavailableProps) {
  const content = resolveUnavailableContent(reason);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
          {content.title}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">{content.description}</p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-3.5 text-left shadow-sm dark:border-sky-500/25 dark:bg-sky-500/10">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300">
          {content.showLogin ? (
            <Mail className="size-4" strokeWidth={2.25} />
          ) : (
            <ShieldAlert className="size-4" strokeWidth={2.25} />
          )}
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">
            {content.showLogin ? "Use your invitation email" : "Contact HR"}
          </p>
          <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
            {content.showLogin
              ? "Sign in with the same personal email that received this invitation."
              : "Ask your HR administrator if you need a new invitation."}
          </p>
        </div>
      </div>

      {content.showLogin ? (
        <Link href={ONBOARDING_ROUTES.login} className={cn(ONBOARDING_AUTH_SUBMIT_CLASS)}>
          Sign in
        </Link>
      ) : null}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} iFranchise HRMS. All rights reserved.
      </p>
    </div>
  );
}
