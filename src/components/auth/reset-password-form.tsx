"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/common/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { resetPasswordAction } from "@/lib/auth/actions";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/auth";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signInHref, setSignInHref] = useState<string | null>(null);
  const isInviteSetup = searchParams.get("invite") === "1";
  const invitedEmail = searchParams.get("email");

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

      toast.success(isInviteSetup ? "Password created successfully" : "Password updated successfully");
      setSignInHref(result.redirectTo);
    });
  });

  if (signInHref) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <h2 className="text-lg font-semibold">
            {isInviteSetup ? "Password created" : "Password updated"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Your account is ready. Sign in with your email and the password you just created.
          </p>
        </div>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          Password saved successfully.
        </div>

        <Link href={signInHref} className={cn(buttonVariants(), "w-full")}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        {isInviteSetup ? (
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>
        ) : null}
        <h2 className="text-lg font-semibold">
          {isInviteSetup ? "Activate your employee account" : "Reset password"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isInviteSetup
            ? "Create a secure password to complete your invitation and access iFranchise HRMS."
            : "Choose a new password for your account. It must meet the organization security policy."}
        </p>
      </div>

      {isInviteSetup && invitedEmail ? (
        <div className="rounded-xl border bg-muted/30 px-3 py-2 text-center text-sm">
          <p className="text-xs text-muted-foreground">Activating account for</p>
          <p className="font-medium text-foreground">{invitedEmail}</p>
        </div>
      ) : null}

      {formError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              disabled={isPending}
              className="pr-10"
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-sm text-destructive">
              {errors.password.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              At least 12 characters with uppercase, lowercase, number, and
              symbol.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••••••"
              disabled={isPending}
              className="pr-10"
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.confirmPassword ? (
            <p className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? isInviteSetup
              ? "Creating..."
              : "Updating..."
            : isInviteSetup
              ? "Create password"
              : "Update password"}
        </Button>

        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          Back to sign in
        </Link>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        {getAuthErrorMessage("RESET_LINK_INVALID")}
      </p>
    </div>
  );
}
