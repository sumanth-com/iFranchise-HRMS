"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "sonner";

import { BrandMarkTile } from "@/components/brand/brand-logo";
import { AuthNotice } from "@/components/auth/auth-notice";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";
import {
  AUTH_ROUTES,
  IDLE_ACTIVITY_STORAGE_KEY,
  PUBLIC_LANDING_ROUTE,
} from "@/lib/auth/constants";
import { DeviceKindReporter } from "@/components/layout/device-kind-reporter";
import { detectClientDeviceKind } from "@/lib/device-access/tablet-device";
import {
  getAuthErrorMessage,
  resolveUserFacingAuthMessage,
} from "@/lib/auth/errors";
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
  "PORTAL_ACCESS_DENIED",
  "TABLET_ACCESS_DENIED",
  "SESSION_EXPIRED",
  "RESET_LINK_INVALID",
  "EMAIL_NOT_CONFIRMED",
];

const SIGNED_OUT_TOAST_ID = "auth-signed-out";

type LoginQueryParams = {
  email?: string;
  error?: string;
  redirectTo?: string;
};

export function LoginForm({ queryParams }: { queryParams: LoginQueryParams }) {
  const router = useRouter();
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
      email: queryParams.email ?? "",
      password: "",
      rememberMe: Boolean(getRememberedEmail()),
    },
  });

  useEffect(() => {
    const queryEmail = queryParams.email?.trim();
    if (queryEmail) {
      setValue("email", queryEmail);
      return;
    }

    const rememberedEmail = getRememberedEmail();
    if (rememberedEmail) {
      setValue("email", rememberedEmail);
      setValue("rememberMe", true);
    }
  }, [queryParams.email, setValue]);

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
    const params = new URLSearchParams(window.location.search);
    if (params.get("suspended") !== "1") return;

    setFormError(getAuthErrorMessage("EMPLOYEE_INACTIVE"));
    params.delete("suspended");
    const query = params.toString();
    router.replace(query ? `${AUTH_ROUTES.login}?${query}` : AUTH_ROUTES.login, {
      scroll: false,
    });
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
        const email = user?.email ?? queryParams.email ?? "";
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
        setFormError(getAuthErrorMessage("RESET_LINK_INVALID"));
        window.history.replaceState(null, "", window.location.pathname);
      })
      .finally(() => setInviteLinkPending(false));
  }, [queryParams.email, router]);

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
    formData.set("clientDevice", detectClientDeviceKind());

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
        setFormError(resolveUserFacingAuthMessage(result.error));
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

      const requestedRedirect = queryParams.redirectTo;
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
      setFormError(getAuthErrorMessage("NETWORK_ERROR"));
    } finally {
      setIsSubmitting(false);
    }
  });

  const errorParam = queryParams.error;
  const profileError =
    errorParam && PROFILE_ERROR_CODES.includes(errorParam as AuthErrorCode)
      ? getAuthErrorMessage(errorParam as AuthErrorCode)
      : errorParam
        ? getAuthErrorMessage("PORTAL_ACCESS_DENIED")
        : null;

  const fieldClass =
    "auth-input h-11 rounded-xl border pl-10 pr-10 text-base font-medium shadow-none placeholder:font-normal focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/30";

  const noticeMessage = formError ?? profileError;

  return (
    <div className="flex flex-col gap-5">
      <div className="auth-login-heading">
        <Link
          href={PUBLIC_LANDING_ROUTE}
          className="mx-auto mb-4 flex w-fit rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/50"
          aria-label="Go to HRMS home"
        >
          <BrandMarkTile size={48} priority />
        </Link>
        <h1>Welcome to iFranchise</h1>
        <p>Access your workspace and continue</p>
      </div>
      <DeviceKindReporter />
      {isInviteLinkPending ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-200/80 bg-indigo-50/50 px-3 py-3 text-sm text-slate-600 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-slate-300">
          <Loader2 className="size-4 animate-spin" />
          Preparing your account setup...
        </div>
      ) : null}

      {showPasswordUpdatedMessage ? (
        <AuthNotice variant="success" title="Password updated">
          Password updated successfully. You can now sign in with your email and new password.
        </AuthNotice>
      ) : null}

      {noticeMessage ? (
        <AuthNotice variant="warning" title="Unable to sign in">
          {noticeMessage}
        </AuthNotice>
      ) : null}

      <form onSubmit={onSubmit} className="mx-auto w-full max-w-[20rem] space-y-3.5" autoComplete="on">
        <div className="space-y-2">
          <Label htmlFor="email" className="sr-only">
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
            <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
              {resolveUserFacingAuthMessage(errors.email.message, "VALIDATION_ERROR")}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="sr-only">
            Password
          </Label>
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
            <p className="text-[13px] font-medium text-slate-600 dark:text-slate-300">
              {resolveUserFacingAuthMessage(errors.password.message, "VALIDATION_ERROR")}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="auth-remember-row flex cursor-pointer items-center gap-2.5 text-[13px] font-medium">
            <input
              type="checkbox"
              className="size-4 rounded border-border bg-background focus:ring-[#8b5cf6]/30"
              {...register("rememberMe")}
            />
            Remember me
          </label>
          <Link
            href="/forgot-password"
            className="auth-forgot-link text-[13px] font-semibold transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className={cn(
            "auth-submit group inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full text-[13px] font-semibold text-white transition-all disabled:opacity-100",
            isSubmitting && "auth-submit--loading",
          )}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <span
                className="auth-submit-arrow transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              >
                <ArrowRight className="size-5" strokeWidth={2.25} />
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
