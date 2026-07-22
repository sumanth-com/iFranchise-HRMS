"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import brandLogo from "@/assets/Logo.png";
import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getAuthErrorMessage } from "@/lib/auth/errors";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [isInviteLinkPending, setInviteLinkPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignedOutMessage, setShowSignedOutMessage] = useState(false);

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
      rememberMe: false,
    },
  });

  useEffect(() => {
    const email = searchParams.get("email");
    if (email) setValue("email", email);
  }, [searchParams, setValue]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signedOut") !== "1") return;

    setShowSignedOutMessage(true);
    params.delete("signedOut");
    const query = params.toString();
    router.replace(query ? `${AUTH_ROUTES.login}?${query}` : AUTH_ROUTES.login, {
      scroll: false,
    });

    const timeout = window.setTimeout(() => {
      setShowSignedOutMessage(false);
    }, 4000);

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
        toast.error("Invitation link is invalid or expired");
        window.history.replaceState(null, "", window.location.pathname);
      })
      .finally(() => setInviteLinkPending(false));
  }, [router, searchParams]);

  const onSubmit = handleSubmit((data) => {
    setFormError(null);
    const formData = new FormData();
    formData.set("email", data.email);
    formData.set("password", data.password);
    if (data.rememberMe) {
      formData.set("rememberMe", "on");
    }

    startTransition(async () => {
      try {
        const result = await loginAction(formData);

        if (!result.success) {
          setFormError(result.message);
          toast.error(result.message);
          return;
        }

        const requestedRedirect = searchParams.get("redirectTo");
        const redirectTo =
          requestedRedirect && requestedRedirect !== "/"
            ? requestedRedirect
            : result.redirectTo;

        toast.success("Signed in successfully");
        router.push(redirectTo);
        router.refresh();
      } catch {
        const message = getAuthErrorMessage("SERVER_ERROR");
        setFormError(message);
        toast.error(message);
      }
    });
  });

  const expired = searchParams.get("expired") === "1";
  const passwordUpdated = searchParams.get("passwordUpdated") === "1";
  const errorParam = searchParams.get("error");
  const profileError =
    errorParam &&
    PROFILE_ERROR_CODES.includes(errorParam as AuthErrorCode)
      ? getAuthErrorMessage(errorParam as AuthErrorCode)
      : null;

  const fieldClass =
    "h-11 rounded-xl border-slate-200 bg-white pl-10 text-sm shadow-none placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20";

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-4 text-center">
        <div className="flex justify-center">
          <div className="auth-logo-shine relative size-16 overflow-hidden rounded-[14px] shadow-[0_8px_24px_rgba(88,28,135,0.28)] ring-1 ring-black/5">
            <Image
              src={brandLogo}
              alt="iFranchise HRMS"
              width={64}
              height={64}
              priority
              className="relative z-0 size-full object-contain"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-slate-900">
            Welcome back <span aria-hidden>👋</span>
          </h1>
          <p className="text-sm text-slate-500">
            Sign in with the email HR registered for your account
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 rounded-2xl border border-[#dbeafe] bg-[#eff6ff] px-4 py-3">
        <ShieldCheck className="size-[18px] shrink-0 text-[#2563eb]" strokeWidth={2} />
        <p className="whitespace-nowrap text-[13px] leading-none tracking-[-0.01em]">
          <span className="font-semibold text-[#1e3a8a]">Secure access.</span>{" "}
          <span className="font-normal text-[#64748b]">
            Your data is protected with enterprise-grade security.
          </span>
        </p>
      </div>

      {isInviteLinkPending ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Preparing your account setup...
        </div>
      ) : null}

      {expired ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {getAuthErrorMessage("SESSION_EXPIRED")}
        </div>
      ) : null}

      {showSignedOutMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 transition-opacity duration-300">
          You have been signed out successfully.
        </div>
      ) : null}

      {passwordUpdated ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Password created successfully. Sign in with your email and new password.
        </div>
      ) : null}

      {profileError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {profileError}
        </div>
      ) : null}

      {formError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
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
            <p className="text-sm text-red-600">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              disabled={isPending}
              className={cn(fieldClass, "pr-10")}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-2 flex items-center px-1 text-slate-400 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {errors.password ? (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          ) : null}
        </div>

        <label className="flex items-center gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
            disabled={isPending}
            {...register("rememberMe")}
          />
          Remember me
        </label>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-[#0f2f6d] text-sm font-semibold text-white hover:bg-[#0c275c]"
          disabled={isPending}
        >
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="pt-2 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} iFranchise HRMS. All rights reserved.
      </p>
    </div>
  );
}
