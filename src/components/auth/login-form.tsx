"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth/actions";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";
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
  const signedOut = searchParams.get("signedOut") === "1";
  const passwordUpdated = searchParams.get("passwordUpdated") === "1";
  const errorParam = searchParams.get("error");
  const profileError =
    errorParam &&
    PROFILE_ERROR_CODES.includes(errorParam as AuthErrorCode)
      ? getAuthErrorMessage(errorParam as AuthErrorCode)
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-lg font-semibold">Sign in</h2>
        <p className="text-sm text-muted-foreground">
          Use your company email and password to access iFranchise HRMS.
        </p>
      </div>

      {isInviteLinkPending ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Preparing your account setup...
        </div>
      ) : null}

      {expired ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          {getAuthErrorMessage("SESSION_EXPIRED")}
        </div>
      ) : null}

      {signedOut ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          You have been signed out successfully.
        </div>
      ) : null}

      {passwordUpdated ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          Password created successfully. Sign in with your company email and new password.
        </div>
      ) : null}

      {profileError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {profileError}
        </div>
      ) : null}

      {formError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Company email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            disabled={isPending}
            {...register("email")}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
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
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 rounded border"
            disabled={isPending}
            {...register("rememberMe")}
          />
          Remember me
        </label>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
