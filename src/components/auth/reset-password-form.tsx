"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/common/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

const fieldClass =
  "h-11 rounded-full border-violet-200/80 bg-violet-50/80 pl-10 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-violet-500 focus-visible:ring-violet-500/25 dark:border-border/80 dark:bg-muted/40";

const submitClass =
  "h-11 w-full rounded-full bg-gradient-to-r from-violet-500 to-violet-700 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(109,40,217,0.35)] hover:from-violet-400 hover:to-violet-600";

export function ResetPasswordForm() {
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
      const result = await resetPasswordAction(formData);

      if (!result.success) {
        setFormError(result.message);
        toast.error(result.message);
        return;
      }

      toast.success(
        isInviteSetup ? "Password created successfully" : "Password updated successfully",
      );
      setSignInHref(result.redirectTo);
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

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
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
        <div className="flex items-start gap-3 rounded-2xl border border-violet-200/90 bg-violet-50/90 px-4 py-3.5 text-left shadow-sm dark:border-violet-500/25 dark:bg-violet-500/10">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
            <ShieldCheck className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-violet-950 dark:text-violet-100">
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
        <div className="flex items-start gap-3 rounded-2xl border border-violet-200/90 bg-violet-50/90 px-4 py-3.5 text-left shadow-sm dark:border-violet-500/25 dark:bg-violet-500/10">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300">
            <ShieldCheck className="size-4" strokeWidth={2.25} />
          </span>
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-semibold text-violet-950 dark:text-violet-100">
              Secure password reset
            </p>
            <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
              Use a strong password with uppercase, lowercase, number, and symbol.
            </p>
          </div>
        </div>
      )}

      {formError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
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
            <p className="text-sm text-destructive">{errors.password.message}</p>
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
            <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
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
