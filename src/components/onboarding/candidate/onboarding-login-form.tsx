"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Eye, EyeOff, KeyRound, LogIn, Mail, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { OnboardingForgotPasswordPanel } from "@/components/onboarding/candidate/onboarding-forgot-password-panel";
import {
  candidateLoginAction,
  requestCandidateOtpAction,
  verifyCandidateOtpAction,
} from "@/lib/onboarding/actions/candidate-onboarding-actions";
import { ONBOARDING_ROUTES } from "@/types/onboarding";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-10 bg-background text-sm text-foreground caret-foreground placeholder:text-muted-foreground dark:bg-background dark:text-foreground";

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label}
        {required ? <span className="text-foreground"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function OnboardingLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canRequestOtp = email.trim().length > 0 && !isPending;
  const canSignIn = email.trim().length > 0 && password.length > 0 && !isPending;

  function loginWithPassword() {
    startTransition(async () => {
      const result = await candidateLoginAction({ personalEmail: email, password });
      if (!result.success) toast.error(result.message);
      else window.location.href = ONBOARDING_ROUTES.portal;
    });
  }

  function requestOtp() {
    startTransition(async () => {
      const result = await requestCandidateOtpAction({ personalEmail: email });
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) setOtpSent(true);
    });
  }

  function verifyOtp() {
    startTransition(async () => {
      const result = await verifyCandidateOtpAction({ personalEmail: email, otp });
      if (!result.success) toast.error(result.message);
      else window.location.href = ONBOARDING_ROUTES.portal;
    });
  }

  return (
    <div className="flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-black/5 ring-1 ring-border/50 dark:shadow-black/25">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-5 text-center text-white sm:px-6">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <LogIn className="h-4 w-4" strokeWidth={2} />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Candidate portal
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            {showForgotPassword ? "Reset password" : "Onboarding sign in"}
          </h1>
          <p className="text-xs leading-snug text-white/65">
            {showForgotPassword
              ? "Verify your email with a code, then set a new permanent password."
              : "Use your personal email and password to continue pre-joining onboarding."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-card px-5 py-5 sm:px-6">
        <Field label="Personal email" required>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={cn(inputClassName, "pl-9")}
            />
          </div>
        </Field>

        {showForgotPassword ? (
          <OnboardingForgotPasswordPanel
            email={email}
            onBack={() => setShowForgotPassword(false)}
          />
        ) : (
          <>
            <Field label="Password" required>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(inputClassName, "pl-9 pr-9")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canSignIn) loginWithPassword();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </Field>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-[11px] font-semibold text-primary hover:underline"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot password?
              </button>
            </div>

            <Button
              className="h-10 w-full text-sm font-semibold"
              onClick={loginWithPassword}
              disabled={!canSignIn}
            >
              {isPending ? "Signing in…" : "Sign in with password"}
            </Button>

            <div className="rounded-lg border border-border bg-muted/50 px-3 py-3 dark:bg-muted/30">
              <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Or use a one-time code
              </p>
              <div className="mt-3 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full text-sm"
                  onClick={requestOtp}
                  disabled={!canRequestOtp}
                >
                  Send verification code
                </Button>
                {otpSent ? (
                  <>
                    <Field label="Verification code" required>
                      <Input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="6-digit code"
                        maxLength={6}
                        value={otp}
                        onChange={(e) =>
                          setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        className={inputClassName}
                      />
                    </Field>
                    <Button
                      type="button"
                      className="h-10 w-full text-sm font-semibold"
                      onClick={verifyOtp}
                      disabled={isPending || otp.length !== 6}
                    >
                      Verify code
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
              No account?{" "}
              <Link
                href={
                  email.trim()
                    ? `${ONBOARDING_ROUTES.signUp}?email=${encodeURIComponent(email.trim())}`
                    : ONBOARDING_ROUTES.signUp
                }
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <UserPlus className="h-3 w-3" />
                Set up password
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
