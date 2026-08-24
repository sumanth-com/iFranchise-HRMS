"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  ONBOARDING_AUTH_FIELD_CLASS,
  ONBOARDING_AUTH_SUBMIT_CLASS,
} from "@/components/onboarding/candidate/onboarding-auth-styles";
import { OnboardingForgotPasswordPanel } from "@/components/onboarding/candidate/onboarding-forgot-password-panel";
import {
  candidateLoginAction,
  requestCandidateOtpAction,
  verifyCandidateOtpAction,
} from "@/lib/onboarding/actions/candidate-onboarding-actions";
import { ONBOARDING_ROUTES } from "@/types/onboarding";
import { cn } from "@/lib/utils";

export function OnboardingLoginForm() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email")?.trim() ?? "";
  const setupDone = searchParams.get("setup") === "done";

  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showSetupDoneMessage, setShowSetupDoneMessage] = useState(setupDone);

  useEffect(() => {
    if (!setupDone) return;
    const timeout = window.setTimeout(() => setShowSetupDoneMessage(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [setupDone]);

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
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
          {showForgotPassword ? "Forgot password" : "Welcome Back"}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          {showForgotPassword
            ? "We will email a 6-digit code to the address on your onboarding invitation."
            : "Sign in with the personal email from your onboarding invitation"}
        </p>
      </div>

      {showSetupDoneMessage && !showForgotPassword ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          Your password is already set. Sign in to continue.
        </div>
      ) : null}

      {!showForgotPassword ? (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-3.5 text-left shadow-sm dark:border-sky-500/25 dark:bg-sky-500/10">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300">
            <ShieldCheck className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">Secure access</p>
            <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
              Your onboarding details are protected with enterprise-grade security.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="onboarding-email" className="text-sm font-semibold text-foreground">
          Personal email
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="onboarding-email"
            type="email"
            autoComplete="username"
            placeholder="Enter your personal email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={ONBOARDING_AUTH_FIELD_CLASS}
          />
        </div>
      </div>

      {showForgotPassword ? (
        <OnboardingForgotPasswordPanel
          email={email}
          onBack={() => setShowForgotPassword(false)}
        />
      ) : (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="onboarding-password" className="text-sm font-semibold text-foreground">
                Password
              </Label>
              <button
                type="button"
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="onboarding-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(ONBOARDING_AUTH_FIELD_CLASS, "pr-10")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSignIn) loginWithPassword();
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="button"
            className={ONBOARDING_AUTH_SUBMIT_CLASS}
            onClick={loginWithPassword}
            disabled={!canSignIn}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                Sign In
                <span
                  className="inline-flex size-5 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                >
                  <ArrowRight className="size-3.5" strokeWidth={2.75} />
                </span>
              </>
            )}
          </Button>

          <div className="space-y-3">
            <p className="text-center text-xs font-medium text-muted-foreground">
              Or use a one-time email code
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full"
              onClick={requestOtp}
              disabled={!canRequestOtp}
            >
              Send verification code
            </Button>
            {otpSent ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-foreground">Verification code</Label>
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={cn(ONBOARDING_AUTH_FIELD_CLASS, "pl-4")}
                  />
                </div>
                <Button
                  type="button"
                  className={ONBOARDING_AUTH_SUBMIT_CLASS}
                  onClick={verifyOtp}
                  disabled={isPending || otp.length !== 6}
                >
                  Verify code
                </Button>
              </div>
            ) : null}
          </div>

          {!setupDone ? (
            <p className="text-center text-sm text-muted-foreground">
              No password yet?{" "}
              <Link
                href={
                  email.trim()
                    ? `${ONBOARDING_ROUTES.signUp}?email=${encodeURIComponent(email.trim())}`
                    : ONBOARDING_ROUTES.signUp
                }
                className="font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
              >
                Set up password
              </Link>
            </p>
          ) : null}
        </>
      )}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} iFranchise HRMS. All rights reserved.
      </p>
    </div>
  );
}
