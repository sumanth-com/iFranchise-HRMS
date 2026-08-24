"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  ONBOARDING_AUTH_FIELD_CLASS,
  ONBOARDING_AUTH_SUBMIT_CLASS,
} from "@/components/onboarding/candidate/onboarding-auth-styles";
import { OnboardingForgotPasswordPanel } from "@/components/onboarding/candidate/onboarding-forgot-password-panel";
import { setupCandidatePasswordByEmailAction } from "@/lib/onboarding/actions/candidate-onboarding-actions";
import { ONBOARDING_ROUTES } from "@/types/onboarding";
import { cn } from "@/lib/utils";

const INVITE_TOKEN_STORAGE_KEY = "ifranchise_onboarding_invite_token";
const MIN_PASSWORD_LENGTH = 8;

export function rememberOnboardingInviteToken(token: string) {
  if (typeof window === "undefined" || !token.trim()) return;
  sessionStorage.setItem(INVITE_TOKEN_STORAGE_KEY, token.trim());
}

export function clearOnboardingInviteToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(INVITE_TOKEN_STORAGE_KEY);
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

/** Login "Set up password" screen — email + password + confirm. */
export function OnboardingSignUpRedirect() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email")?.trim() ?? "";

  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const lengthMet = password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit = email.trim().length > 0 && lengthMet && passwordsMatch && !isPending;

  const strengthLabel = useMemo(() => {
    if (!password) return "Min. 8 characters";
    if (!lengthMet) return `${MIN_PASSWORD_LENGTH - password.length} more needed`;
    return "Ready";
  }, [password, lengthMet]);

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
      const result = await setupCandidatePasswordByEmailAction({
        personalEmail: email,
        password,
        confirmPassword,
      });
      if (!result.success) {
        toast.error(result.message);
        if (result.message.toLowerCase().includes("already set")) {
          window.location.href = `${ONBOARDING_ROUTES.login}?email=${encodeURIComponent(email.trim())}&setup=done`;
        }
        return;
      }
      clearOnboardingInviteToken();
      toast.success(result.message);
      window.location.href = ONBOARDING_ROUTES.portal;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
          {showForgotPassword ? "Forgot password" : "Set your password"}
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          {showForgotPassword
            ? "We will email a 6-digit code to reset your onboarding password."
            : "Create a password for the email that received your onboarding invitation."}
        </p>
      </div>

      {!showForgotPassword ? (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200/90 bg-sky-50/90 px-4 py-3.5 text-left shadow-sm dark:border-sky-500/25 dark:bg-sky-500/10">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300">
            <ShieldCheck className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-sky-950 dark:text-sky-100">Secure setup</p>
            <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
              Use the same personal email HR used on your invitation.
            </p>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="onboarding-setup-email" className="text-sm font-semibold text-foreground">
          Personal email
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="onboarding-setup-email"
            type="email"
            autoComplete="email"
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
              <Label htmlFor="onboarding-setup-password" className="text-sm font-semibold text-foreground">
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
                id="onboarding-setup-password"
                type={showPassword ? "text" : "password"}
                minLength={MIN_PASSWORD_LENGTH}
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

          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <CheckItem met={lengthMet} label={`${MIN_PASSWORD_LENGTH}+ characters`} />
            <CheckItem met={passwordsMatch} label="Passwords match" />
            {password ? (
              <span className="text-[11px] font-medium text-muted-foreground">{strengthLabel}</span>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="onboarding-setup-confirm" className="text-sm font-semibold text-foreground">
              Confirm password
            </Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="onboarding-setup-confirm"
                type={showConfirm ? "text" : "password"}
                minLength={MIN_PASSWORD_LENGTH}
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
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) submit();
                }}
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
            type="button"
            className={ONBOARDING_AUTH_SUBMIT_CLASS}
            disabled={!canSubmit}
            onClick={submit}
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Saving password...
              </>
            ) : (
              <>
                Save password & continue
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
        </>
      )}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} iFranchise HRMS. All rights reserved.
      </p>
    </div>
  );
}
