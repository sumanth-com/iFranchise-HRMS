"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/common/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction } from "@/lib/auth/actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

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
      const result = await forgotPasswordAction(formData);

      if (!result.success) {
        setFormError(result.message);
        toast.error(result.message);
        return;
      }

      setIsSubmitted(true);
      toast.success("Password reset instructions sent");
    });
  });

  if (isSubmitted) {
    return (
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Check your email
          </h1>
          <p className="text-sm text-slate-500">
            If an account exists for that email, you will receive password reset
            instructions shortly.
          </p>
        </div>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 w-full rounded-xl",
          )}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Forgot password
        </h1>
        <p className="text-sm text-slate-500">
          Enter your company email and we will send you a reset link.
        </p>
      </div>

      {formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Company Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your company email"
            disabled={isPending}
            className="h-11 rounded-xl border-slate-200"
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          ) : null}
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-[#0f2f6d] text-sm font-semibold text-white hover:bg-[#0c275c]"
          disabled={isPending}
        >
          {isPending ? "Sending..." : "Send reset link"}
        </Button>

        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          Back to sign in
        </Link>
      </form>
    </div>
  );
}
