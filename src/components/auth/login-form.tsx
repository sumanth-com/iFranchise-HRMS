"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";
import { AUTH_ROUTES, IDLE_ACTIVITY_STORAGE_KEY } from "@/lib/auth/constants";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import {
  clearRememberedEmail,
  getRememberedEmail,
  setRememberedEmail,
} from "@/lib/auth/remember-email";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AuthErrorCode } from "@/types/auth";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

const PROFILE_ERROR_CODES: AuthErrorCode[] = [
  "EMPLOYEE_NOT_FOUND",
  "EMPLOYEE_INACTIVE",
  "EMPLOYEE_DELETED",
  "NO_ROLES",
  "ORGANIZATION_NOT_FOUND",
];

const SIGNED_OUT_TOAST_ID = "auth-signed-out";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isInviteLinkPending, setInviteLinkPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordUpdatedMessage, setShowPasswordUpdatedMessage] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: searchParams.get("email") ?? "",
      password: "",
      rememberMe: Boolean(getRememberedEmail()),
    },
  });

  useEffect(() => {
    const queryEmail = searchParams.get("email")?.trim();
    if (queryEmail) {
      setValue("email", queryEmail);
      return;
    }

    const rememberedEmail = getRememberedEmail();
    if (rememberedEmail) {
      setValue("email", rememberedEmail);
      setValue("rememberMe", true);
    }
  }, [searchParams, setValue]);

  const signedOutToastHandledRef = useRef(false);

  useEffect(() => {
    if (signedOutToastHandledRef.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("signedOut") !== "1") return;

    signedOutToastHandledRef.current = true;
    params.delete("signedOut");
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      query ? `${AUTH_ROUTES.login}?${query}` : AUTH_ROUTES.login,
    );

    toast.success("You have been signed out successfully.", {
      id: SIGNED_OUT_TOAST_ID,
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("passwordUpdated") !== "1") return;

    setShowPasswordUpdatedMessage(true);
    params.delete("passwordUpdated");
    const query = params.toString();
    router.replace(query ? `${AUTH_ROUTES.login}?${query}` : AUTH_ROUTES.login, {
      scroll: false,
    });

    const timeout = window.setTimeout(() => {
      setShowPasswordUpdatedMessage(false);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [router]);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    if (!hash) return;

    const hashParams = new URLSearchParams(hash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const type = hashParams.get("type");

    if (!accessToken || !refreshToken) return;

    setInviteLinkPending(true);
    const supabase = createClient();

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(async ({ error }) => {
        if (error) throw error;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const email = user?.email ?? searchParams.get("email") ?? "";
        const target =
          type === "invite" || type === "recovery"
            ? `${AUTH_ROUTES.resetPassword}?${new URLSearchParams({
                ...(type === "invite" ? { invite: "1" } : {}),
                ...(email ? { email } : {}),
              }).toString()}`
            : AUTH_ROUTES.dashboard;

        window.history.replaceState(null, "", window.location.pathname);
        router.replace(target);
      })
      .catch(() => {
        setFormError("Invitation link is invalid or expired. Ask HR to resend it.");
        window.history.replaceState(null, "", window.location.pathname);
      })
      .finally(() => setInviteLinkPending(false));
  }, [router, searchParams]);

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null);
    setIsSubmitting(true);
    const clientT0 = performance.now();

    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    if (data.rememberMe) {
      formData.set("rememberMe", "on");
    }

    try {
      const result = await loginAction(formData);
      if (process.env.NODE_ENV === "development") {
        console.info("[login-timing]", {
          atMs: Math.round(performance.now() - clientT0),
          label: "client:loginAction returned",
          success: result.success,
        });
      }

      if (!result.success) {
        setFormError(result.message);
        return;
      }

      if (data.rememberMe) {
        setRememberedEmail(data.email);
      } else {
        clearRememberedEmail();
      }

      try {
        window.localStorage.setItem(
          IDLE_ACTIVITY_STORAGE_KEY,
          Date.now().toString(),
        );
      } catch {
        // Ignore storage failures
      }

      const requestedRedirect = searchParams.get("redirectTo");
      const redirectTo = requestedRedirect
        ? getSafeRedirectPath(requestedRedirect, result.redirectTo)
        : result.redirectTo;

      if (process.env.NODE_ENV === "development") {
        console.info("[login-timing]", {
          atMs: Math.round(performance.now() - clientT0),
          label: "client:router.replace",
          redirectTo,
        });
      }
      router.replace(redirectTo);
    } catch {
      setFormError(getAuthErrorMessage("SERVER_ERROR"));
    } finally {
      setIsSubmitting(false);
    }
  });

  const errorParam = searchParams.get("error");
  const profileError =
    errorParam &&
    PROFILE_ERROR_CODES.includes(errorParam as AuthErrorCode)
      ? getAuthErrorMessage(errorParam as AuthErrorCode)
      : null;

  const fieldClass =
    "h-11 rounded-full border-indigo-200/80 bg-indigo-50/50 pl-10 text-sm font-medium text-foreground shadow-none placeholder:text-muted-foreground/80 focus-visible:border-[#5f55ee] focus-visible:ring-[#5f55ee]/25 dark:border-border/80 dark:bg-muted/40";

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground">
          Welcome Back
        </h1>
        <p className="text-sm font-medium text-muted-foreground">
          Sign in with the email HR registered for your account
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 px-4 py-3.5 text-left shadow-sm dark:border-indigo-500/25 dark:bg-indigo-500/10">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#5f55ee]/15 text-[#5f55ee] dark:bg-[#5f55ee]/20 dark:text-indigo-300">
          <ShieldCheck className="size-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-slate-900 dark:text-indigo-100">
            Secure access
          </p>
          <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300">
            Your workplace data is protected with enterprise-grade security.
          </p>
        </div>
      </div>

      {isInviteLinkPending ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Preparing your account setup...
        </div>
      ) : null}

      {showPasswordUpdatedMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition-opacity duration-300 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
          Password created successfully. Sign in with your email and new password.
        </div>
      ) : null}

      {profileError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {profileError}
        </div>
      ) : null}

      {formError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
          {formError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-semibold text-foreground">
            Work Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="Enter your work email"
              className={fieldClass}
              {...register("email")}
            />
          </div>
          {errors.email ? (
            <p className="text-sm font-medium text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#5f55ee] hover:text-[#5247e3] dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              Forgot Password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              className={cn(fieldClass, "pr-10")}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-2 flex items-center px-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-sm font-medium text-destructive">{errors.password.message}</p>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-foreground/90">
          <input
            type="checkbox"
            className="size-4 rounded border-border bg-background text-[#5f55ee] focus:ring-[#5f55ee]/30"
            {...register("rememberMe")}
          />
          Remember me
        </label>

        <Button
          type="submit"
          className="group inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full bg-[#5f55ee] hover:bg-[#5247e3] text-sm font-semibold text-white shadow-[0_10px_24px_rgba(95,85,238,0.4)] transition-all disabled:opacity-100"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
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
      </form>

      <p className="pt-2 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} iFranchise HRMS. All rights reserved.
      </p>
    </div>
  );
}
