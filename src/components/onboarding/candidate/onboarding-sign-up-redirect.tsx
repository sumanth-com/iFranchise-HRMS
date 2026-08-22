"use client";

import type { ReactNode } from "react";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Eye, EyeOff, KeyRound, LogIn, Mail, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
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

const inputClassName =
  "h-10 bg-background text-sm text-foreground caret-foreground placeholder:text-muted-foreground dark:bg-background dark:text-foreground";

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
  const [isPending, startTransition] = useTransition();

  const lengthMet = password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canSubmit =
    email.trim().length > 0 && lengthMet && passwordsMatch && !isPending;

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
        return;
      }
      clearOnboardingInviteToken();
      toast.success(result.message);
      window.location.href = ONBOARDING_ROUTES.portal;
    });
  }

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
          <h1 className="text-xl font-semibold tracking-tight">Set up your password</h1>
          <p className="text-xs leading-snug text-white/65">
            Create your permanent password, then use it to sign in to the pre-joining portal.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-card px-5 py-5 sm:px-6">
        <Field label="Personal email">
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

        <Field label="Password">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(inputClassName, "pl-9 pr-9")}
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
                lengthMet ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground",
              )}
            >
              {strengthLabel}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <CheckItem met={lengthMet} label={`${MIN_PASSWORD_LENGTH}+ characters`} />
            <CheckItem met={passwordsMatch} label="Passwords match" />
          </div>
        </div>

        <Field label="Confirm password">
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showConfirm ? "text" : "password"}
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={128}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={cn(
                inputClassName,
                "pl-9 pr-9 transition-colors",
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
        </Field>

        <Button
          type="button"
          className="h-10 w-full text-sm font-semibold"
          disabled={!canSubmit}
          onClick={submit}
        >
          {isPending ? "Saving password…" : "Save password & continue"}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Already set a password?{" "}
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
