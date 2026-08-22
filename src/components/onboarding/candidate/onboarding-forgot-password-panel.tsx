"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  requestCandidatePasswordResetAction,
  resetCandidatePasswordWithOtpAction,
} from "@/lib/onboarding/actions/candidate-onboarding-actions";
import { ONBOARDING_ROUTES } from "@/types/onboarding";
import { cn } from "@/lib/utils";

const inputClassName =
  "h-10 bg-background text-sm text-foreground caret-foreground placeholder:text-muted-foreground dark:bg-background dark:text-foreground";

const MIN_PASSWORD_LENGTH = 8;

type OnboardingForgotPasswordPanelProps = {
  email: string;
  onEmailChange?: (email: string) => void;
  className?: string;
};

export function OnboardingForgotPasswordPanel({
  email,
  onEmailChange,
  className,
}: OnboardingForgotPasswordPanelProps) {
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const canRequest = email.trim().length > 0 && !isPending;
  const lengthMet = password.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const canReset =
    canRequest && otp.length === 6 && lengthMet && passwordsMatch && !isPending;

  function sendCode() {
    startTransition(async () => {
      const result = await requestCandidatePasswordResetAction({ personalEmail: email });
      toast[result.success ? "success" : "error"](result.message);
      if (result.success) setOtpSent(true);
    });
  }

  function resetPassword() {
    if (!lengthMet) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }

    startTransition(async () => {
      const result = await resetCandidatePasswordWithOtpAction({
        personalEmail: email,
        otp,
        password,
        confirmPassword,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      window.location.href = ONBOARDING_ROUTES.portal;
    });
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-muted/50 px-3 py-3 dark:bg-muted/30",
        className,
      )}
    >
      <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Forgot password
      </p>
      <p className="mt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
        We will email a code to reset your permanent portal password.
      </p>

      <div className="mt-3 space-y-2">
        {onEmailChange ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">
              Personal email <span className="text-foreground">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="you@email.com"
              className={inputClassName}
            />
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full text-sm"
          onClick={sendCode}
          disabled={!canRequest}
        >
          {isPending && !otpSent ? "Sending…" : otpSent ? "Resend reset code" : "Send reset code"}
        </Button>

        {otpSent ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Reset code <span className="text-foreground">*</span>
              </Label>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={inputClassName}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                New password <span className="text-foreground">*</span>
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  minLength={MIN_PASSWORD_LENGTH}
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
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Confirm new password <span className="text-foreground">*</span>
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={showConfirm ? "text" : "password"}
                  minLength={MIN_PASSWORD_LENGTH}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={cn(
                    inputClassName,
                    "pl-9 pr-9",
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
            </div>

            <Button
              type="button"
              className="h-10 w-full text-sm font-semibold"
              onClick={resetPassword}
              disabled={!canReset}
            >
              {isPending ? "Updating password…" : "Reset password & continue"}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
