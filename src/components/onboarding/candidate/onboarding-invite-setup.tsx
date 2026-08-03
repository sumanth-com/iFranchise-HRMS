"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { setupCandidateAccountAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";
import { ONBOARDING_ROUTES } from "@/types/onboarding";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;

type OnboardingInviteSetupProps = {
  token: string;
  personalEmail: string;
  fullName: string;
};

type StrengthTier = {
  score: number;
  label: string;
  barClass: string;
  pulse?: boolean;
};

function evaluatePasswordStrength(password: string): StrengthTier {
  if (!password) {
    return { score: 0, label: "Enter at least 8 characters", barClass: "bg-muted" };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      score: Math.max(1, Math.round((password.length / MIN_PASSWORD_LENGTH) * 2)),
      label: `${MIN_PASSWORD_LENGTH - password.length} more character${MIN_PASSWORD_LENGTH - password.length === 1 ? "" : "s"} needed`,
      barClass: "bg-red-500",
      pulse: true,
    };
  }

  let score = 3;
  let label = "Minimum length met";

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (password.length >= 12 && variety >= 3) {
    score = 5;
    label = "Strong password";
  } else if (password.length >= 10 || variety >= 2) {
    score = 4;
    label = "Good password";
  }

  const barClass =
    score >= 5 ? "bg-emerald-500" : score >= 4 ? "bg-emerald-400" : "bg-amber-500";

  return { score, label, barClass };
}

function RequirementRow({
  met,
  label,
  animate,
}: {
  met: boolean;
  label: string;
  animate?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 text-xs transition-all duration-300",
        met ? "text-emerald-700" : "text-muted-foreground",
        animate && !met && "animate-pulse",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
          met
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-border bg-background",
        )}
      >
        {met ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
      </span>
      <span>{label}</span>
    </li>
  );
}

function FieldGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="text-center sm:text-left">
        <Label className="text-sm font-medium text-foreground">
          {label} <span className="text-foreground">*</span>
        </Label>
        {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

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
      if (!result.success) toast.error(result.message);
      else window.location.href = "/onboarding/portal";
    });
  }

  const firstName = fullName.trim().split(/\s+/)[0] ?? fullName;

  return (
    <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl shadow-slate-900/[0.06] ring-1 ring-black/[0.03]">
      {/* Header */}
      <div className="relative border-b border-border/50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-9 text-center text-white sm:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-sm">
            <Lock className="h-6 w-6" strokeWidth={2} />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
            Secure account setup
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
            Welcome, {firstName}
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-white/70">
            Create your temporary onboarding password to access the pre-joining portal.
          </p>
          <div className="mx-auto mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90">
            <Mail className="h-3.5 w-3.5 shrink-0 text-white/60" />
            <span className="truncate">{personalEmail}</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-8 sm:px-10 sm:py-9">
        <div className="mx-auto max-w-sm space-y-7">
          <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              This password secures your documents until HR activates your official company account.
              Minimum <strong className="font-medium text-foreground">8 characters</strong> required.
            </p>
          </div>

          <FieldGroup label="Password">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={128}
                placeholder="Enter password (min. 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FieldGroup>

          <div className="rounded-xl border border-border/80 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Password strength
              </span>
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300",
                  lengthMet ? "text-emerald-600" : "text-muted-foreground",
                )}
              >
                {strength.label}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 ease-out",
                  strength.barClass,
                  strength.pulse && "animate-pulse",
                )}
                style={{ width: barWidth }}
              />
            </div>
            <ul className="mt-4 space-y-2.5">
              <RequirementRow
                met={lengthMet}
                label={`At least ${MIN_PASSWORD_LENGTH} characters`}
                animate={password.length > 0 && !lengthMet}
              />
              <RequirementRow
                met={passwordsMatch}
                label="Both passwords match"
                animate={confirmPassword.length > 0 && !passwordsMatch}
              />
            </ul>
          </div>

          <FieldGroup
            label="Confirm password"
            hint="Re-enter the same password to verify it is correct."
          >
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={128}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "h-11 pr-10 transition-colors",
                  confirmPassword && !passwordsMatch && "border-red-300 focus-visible:ring-red-200",
                  passwordsMatch && "border-emerald-400 focus-visible:ring-emerald-200",
                )}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </FieldGroup>

          <div className="pt-1">
            <Button
              className="h-12 w-full text-sm font-semibold shadow-sm"
              onClick={submit}
              disabled={!canSubmit}
            >
              {isPending ? "Creating account…" : "Create account & continue"}
            </Button>
          </div>

          <div className="rounded-xl border border-dashed border-border/80 bg-slate-50/50 px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-2 text-xs font-medium text-foreground">
              <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Already completed setup?</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Sign in with your personal email and password.
            </p>
            <Link
              href={ONBOARDING_ROUTES.login}
              className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <LogIn className="h-3.5 w-3.5" />
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
