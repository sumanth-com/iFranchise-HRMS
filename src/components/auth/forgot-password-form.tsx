"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AuthNotice } from "@/components/auth/auth-notice";
import { Button, buttonVariants } from "@/components/common/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { resolveUserFacingAuthMessage } from "@/lib/auth/errors";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

const fieldClass =
  "h-11 rounded-full border-indigo-200/80 bg-indigo-50/50 pl-10 text-sm text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-[#5f55ee] focus-visible:ring-[#5f55ee]/25 dark:border-border/80 dark:bg-muted/40";

const submitClass =
  "h-11 w-full rounded-full bg-[#5f55ee] hover:bg-[#5247e3] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(95,85,238,0.4)] transition-all";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit((data) => {
    setFormError(null);
    const formData = new FormData();
    formData.set("email", data.email);

    startTransition(async () => {
      try {
        const result = await forgotPasswordAction(formData);

        if (!result.success) {
          setFormError(resolveUserFacingAuthMessage(result.error, "NETWORK_ERROR"));
          return;
        }

        setIsSubmitted(true);
        toast.success(
          "If an account exists for this email, you'll receive a reset link shortly.",
        );
      } catch {
        setFormError(resolveUserFacingAuthMessage("NETWORK_ERROR"));
      }
    });
  });

  if (isSubmitted) {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            If an account exists for this email, you&apos;ll receive a password reset
            link shortly.
          </p>
        </div>
        <Link
          href={AUTH_ROUTES.login}
          className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full rounded-full")}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
          Forgot password
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the email HR registered for your account and we will send a reset link.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 px-4 py-3.5 text-left shadow-sm dark:border-indigo-500/25 dark:bg-indigo-500/10">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#5f55ee]/15 text-[#5f55ee] dark:bg-[#5f55ee]/20 dark:text-indigo-300">
          <ShieldCheck className="size-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-indigo-100">
            Secure recovery
          </p>
          <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
            Reset links are sent only to your registered workplace email.
          </p>
        </div>
      </div>

      {formError ? (
        <AuthNotice variant="warning" title="Unable to send reset link">
          {formError}
        </AuthNotice>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground/90">
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="Enter your email"
              disabled={isPending}
              className={fieldClass}
              {...register("email")}
            />
          </div>
          {errors.email ? (
            <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
              {resolveUserFacingAuthMessage(errors.email.message, "VALIDATION_ERROR")}
            </p>
          ) : null}
        </div>

        <Button type="submit" className={submitClass} disabled={isPending}>
          {isPending ? "Sending..." : "Send reset link"}
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
