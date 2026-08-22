"use client";

import Link from "next/link";
import { LogIn, Mail, UserPlus } from "lucide-react";

import { buttonVariants } from "@/components/common/button";
import { ONBOARDING_ROUTES } from "@/types/onboarding";
import { cn } from "@/lib/utils";

export function OnboardingSignUpInfo() {
  return (
    <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5 ring-1 ring-border/50 dark:shadow-black/25">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-5 text-center text-white sm:px-6">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <UserPlus className="h-4 w-4" strokeWidth={2} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            New candidate
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-xs leading-snug text-white/65">
            Pre-joining onboarding starts from the secure invitation link HR sends to your personal
            email.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-card px-5 py-5 sm:px-6">
        <div className="space-y-3 rounded-lg border border-border bg-muted/50 px-3 py-3 dark:bg-muted/30">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="space-y-1 text-left">
              <p className="text-sm font-medium text-foreground">Check your invitation email</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Open the secure onboarding link from iFranchise HR. You will set your password there
                and then continue in this portal.
              </p>
            </div>
          </div>
          <div className="border-t border-border/70 pt-3 text-xs leading-relaxed text-muted-foreground">
            Did not receive an email? Contact your HR team to resend your onboarding invitation.
          </div>
        </div>

        <Link
          href={ONBOARDING_ROUTES.login}
          className={cn(buttonVariants({ size: "default" }), "h-10 w-full text-sm font-semibold")}
        >
          <LogIn className="mr-2 h-4 w-4" />
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}
