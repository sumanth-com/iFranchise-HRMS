"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Check, Eye, EyeOff, LogIn, Lock, Mail } from "lucide-react";
import { useMemo, useState, useTransition, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
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
    <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5 ring-1 ring-border/50 dark:shadow-black/25">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-5 text-center text-white sm:px-6">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Lock className="h-4 w-4" strokeWidth={2} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Secure account setup
          </p>
          <h1 className="text-xl font-semibold tracking-tight">Welcome, {firstName}</h1>
          <p className="text-xs leading-snug text-white/65">
            Create your permanent password for the pre-joining portal. You will use it to sign in later.
          </p>
          <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-white/90">
            <Mail className="h-3 w-3 shrink-0 text-white/55" />
            <span className="truncate">{personalEmail}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-card px-5 py-5 sm:px-6">
        <Field label="Password">
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </Field>

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

        <Field label="Confirm password">
          <div className="relative">
            <Input
              type={showConfirm ? "text" : "password"}
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(
                inputClassName,
                "transition-colors",
                confirmPassword && !passwordsMatch && "border-red-400 dark:border-red-500",
                passwordsMatch && "border-emerald-500 dark:border-emerald-400",
              )}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </Field>

        <Button
          className="h-10 w-full text-sm font-semibold"
          onClick={submit}
          disabled={!canSubmit}
        >
          {isPending ? "Creating account…" : "Create account & continue"}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Already set up?{" "}
          <Link
            href={ONBOARDING_ROUTES.login}
            className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
          >
            <LogIn className="h-3 w-3" />
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
