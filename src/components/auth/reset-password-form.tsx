"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AuthNotice } from "@/components/auth/auth-notice";
import { Button, buttonVariants } from "@/components/common/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { resolveUserFacingAuthMessage } from "@/lib/auth/errors";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

const fieldClass =
  "h-11 rounded-full border-indigo-200/80 bg-indigo-50/50 pl-10 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#5f55ee] focus-visible:ring-[#5f55ee]/25 dark:border-border/80 dark:bg-muted/40";

const submitClass =
  "h-11 w-full rounded-full bg-[#5f55ee] hover:bg-[#5247e3] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(95,85,238,0.4)] transition-all";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signInHref, setSignInHref] = useState<string | null>(null);
  const isInviteSetup = searchParams.get("invite") === "1";
  const invitedEmail = searchParams.get("email");
  const invitedName = searchParams.get("name");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = handleSubmit((data) => {
    setFormError(null);
    const formData = new FormData();
    formData.set("password", data.password);
    formData.set("confirmPassword", data.confirmPassword);

    startTransition(async () => {
      try {
        const result = await resetPasswordAction(formData);

        if (!result.success) {
          setFormError(resolveUserFacingAuthMessage(result.error, "NETWORK_ERROR"));
          return;
        }

        if (isInviteSetup) {
          toast.success("Password created successfully");
          setSignInHref(result.redirectTo);
          return;
        }

        toast.success("Password reset successfully");
        router.replace(result.redirectTo);
      } catch {
        setFormError(resolveUserFacingAuthMessage("NETWORK_ERROR"));
      }
    });
  });

  if (signInHref) {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="size-6" />
          </div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
            {isInviteSetup ? "Account activated" : "Password updated"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your account is ready. Sign in with your email and the password you just created.
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          Password saved successfully.
        </div>

        <Link href={signInHref} className={cn(buttonVariants(), submitClass)}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
          {isInviteSetup ? "Activate your account" : "Reset password"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isInviteSetup
            ? "Create a secure password to finish user provisioning and open iFranchise HRMS."
            : "Choose a new password that meets your organization security policy."}
        </p>
      </div>

      {isInviteSetup ? (
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 px-4 py-3.5 text-left shadow-sm dark:border-indigo-500/25 dark:bg-indigo-500/10">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#5f55ee]/15 text-[#5f55ee] dark:bg-[#5f55ee]/20 dark:text-indigo-300">
            <ShieldCheck className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-slate-900 dark:text-indigo-100">
              Invitation verified
            </p>
            <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
              {invitedName || invitedEmail
                ? `Welcome${invitedName ? ` ${invitedName}` : ""}${
                    invitedEmail ? ` · ${invitedEmail}` : ""
                  }`
                : "Set your password to activate workplace access."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 px-4 py-3.5 text-left shadow-sm dark:border-indigo-500/25 dark:bg-indigo-500/10">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#5f55ee]/15 text-[#5f55ee] dark:bg-[#5f55ee]/20 dark:text-indigo-300">
            <ShieldCheck className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-slate-900 dark:text-indigo-100">
              Secure password reset
            </p>
            <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
              Use a strong password with uppercase, lowercase, number, and symbol.
            </p>
          </div>
        </div>
      )}

      {formError ? (
        <AuthNotice variant="warning" title="Unable to save password">
          {formError}
        </AuthNotice>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium text-foreground/90">
            {isInviteSetup ? "Create password" : "New password"}
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              disabled={isPending}
              className={cn(fieldClass, "pr-10")}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
              {resolveUserFacingAuthMessage(errors.password.message, "VALIDATION_ERROR")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              At least 12 characters with uppercase, lowercase, number, and symbol.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/90">
            Confirm password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              disabled={isPending}
              className={cn(fieldClass, "pr-10")}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground hover:text-foreground"
              aria-label={
                showConfirmPassword ? "Hide confirm password" : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
              {resolveUserFacingAuthMessage(
                errors.confirmPassword.message,
                "PASSWORD_MISMATCH",
              )}
            </p>
          ) : null}
        </div>

        <Button type="submit" className={submitClass} disabled={isPending}>
          {isPending
            ? isInviteSetup
              ? "Creating..."
              : "Updating..."
            : isInviteSetup
              ? "Create password & activate"
              : "Update password"}
        </Button>

        <Link
          href={AUTH_ROUTES.login}
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
