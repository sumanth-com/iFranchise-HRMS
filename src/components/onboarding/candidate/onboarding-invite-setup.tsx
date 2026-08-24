"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useMemo, useState, useTransition, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  ONBOARDING_AUTH_FIELD_CLASS,
  ONBOARDING_AUTH_SUBMIT_CLASS,
} from "@/components/onboarding/candidate/onboarding-auth-styles";
import { setupCandidateAccountAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";
import {
  clearOnboardingInviteToken,
  rememberOnboardingInviteToken,
} from "@/components/onboarding/candidate/onboarding-sign-up-redirect";
import { ONBOARDING_ROUTES } from "@/types/onboarding";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;

type OnboardingInviteSetupProps = {
  token: string;
  personalEmail: string;
  fullName: string;
};

type StrengthTier = {
  label: string;
  barClass: string;
  pulse?: boolean;
  score: number;
};

function evaluatePasswordStrength(password: string): StrengthTier {
  if (!password) {
    return { score: 0, label: "Min. 8 characters", barClass: "bg-muted" };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      score: Math.max(1, Math.round((password.length / MIN_PASSWORD_LENGTH) * 2)),
      label: `${MIN_PASSWORD_LENGTH - password.length} more needed`,
      barClass: "bg-red-500",
      pulse: true,
    };
  }

  let score = 3;
  let label = "Ready";

  const variety = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  if (password.length >= 12 && variety >= 3) {
    score = 5;
    label = "Strong";
  } else if (password.length >= 10 || variety >= 2) {
    score = 4;
    label = "Good";
  }

  const barClass =
    score >= 5 ? "bg-emerald-500" : score >= 4 ? "bg-emerald-400" : "bg-amber-500";

  return { score, label, barClass };
}

function CheckItem({ met, label }: { met: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium",
        met ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
          met
            ? "border-emerald-500 bg-emerald-500 text-white dark:border-emerald-400 dark:bg-emerald-400"
            : "border-border bg-background",
        )}
      >
        {met ? <Check className="h-2 w-2" strokeWidth={3} /> : null}
      </span>
      {label}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label} <span className="text-foreground">*</span>
      </Label>
      {children}
    </div>
  );
}

const inputClassName =
  "h-10 bg-background pr-9 text-sm text-foreground caret-foreground placeholder:text-muted-foreground dark:bg-background dark:text-foreground";

export function OnboardingInviteSetup({
  token,
  personalEmail,
  fullName,
}: OnboardingInviteSetupProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const strength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const lengthMet = password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = lengthMet && passwordsMatch && !isPending;

  useEffect(() => {
    rememberOnboardingInviteToken(token);
  }, [token]);

  const barWidth =
    password.length === 0
      ? "0%"
      : password.length < MIN_PASSWORD_LENGTH
        ? `${Math.min(100, (password.length / MIN_PASSWORD_LENGTH) * 70)}%`
        : `${Math.min(100, 55 + strength.score * 9)}%`;

  function submit() {
    if (!lengthMet) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await setupCandidateAccountAction(token, { password, confirmPassword });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      clearOnboardingInviteToken();
      toast.success("Password saved. You can sign in with this password anytime.");
      window.location.href = "/onboarding/portal";
    });
  }

  const firstName = fullName.trim().split(/\s+/)[0] ?? fullName;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
          Welcome, {firstName}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Create a password for your onboarding portal using the email on your invitation.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-3.5 text-left shadow-sm dark:border-sky-500/25 dark:bg-sky-500/10">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300">
          <Mail className="size-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">Invitation email</p>
          <p className="truncate text-[13px] leading-snug text-slate-600 dark:text-slate-300">
            {personalEmail}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(ONBOARDING_AUTH_FIELD_CLASS, "pr-10")}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/50 px-3 py-2.5 dark:bg-muted/30">
          <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="text-foreground/80">Strength</span>
            <span
              className={cn(
                lengthMet
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              {strength.label}
            </span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500 ease-out",
                strength.barClass,
                strength.pulse && "animate-pulse",
              )}
              style={{ width: barWidth }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <CheckItem met={lengthMet} label={`${MIN_PASSWORD_LENGTH}+ characters`} />
            <CheckItem met={passwordsMatch} label="Passwords match" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Confirm password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showConfirm ? "text" : "password"}
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(
                ONBOARDING_AUTH_FIELD_CLASS,
                "pr-10",
                confirmPassword && !passwordsMatch && "border-red-400 dark:border-red-500",
                passwordsMatch && "border-emerald-500 dark:border-emerald-400",
              )}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground hover:text-foreground"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <Button
          className={ONBOARDING_AUTH_SUBMIT_CLASS}
          onClick={submit}
          disabled={!canSubmit}
        >
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create account & continue
              <span
                className="inline-flex size-5 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30"
                aria-hidden
              >
                <ArrowRight className="size-3.5" strokeWidth={2.75} />
              </span>
            </>
          )}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already set up?{" "}
          <Link
            href={ONBOARDING_ROUTES.login}
            className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
