"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

import { LoadingSpinner } from "@/components/common/loading-spinner";
import { AuthNotice } from "@/components/auth/auth-notice";
import { buttonVariants } from "@/components/common/button";
import { AUTH_ROUTES } from "@/lib/auth/constants";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type GateStatus = "loading" | "ready" | "error";

type ResetPasswordSessionGateProps = {
  children: ReactNode;
};

function cleanUrl(pathname: string, searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams);
  params.delete("code");
  params.delete("token_hash");
  params.delete("type");
  const query = params.toString();
  window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function hasInviteOrRecoveryMaterial(searchParams: URLSearchParams): {
  hashAccessToken: string | null;
  hashRefreshToken: string | null;
  code: string | null;
  tokenHash: string | null;
  type: string | null;
} {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  const hashParams = hash ? new URLSearchParams(hash) : null;

  return {
    hashAccessToken: hashParams?.get("access_token") ?? null,
    hashRefreshToken: hashParams?.get("refresh_token") ?? null,
    code: searchParams.get("code"),
    tokenHash: searchParams.get("token_hash"),
    type: searchParams.get("type"),
  };
}

function sessionMatchesExpected(
  email: string | null | undefined,
  expectedEmail: string,
): boolean {
  if (!expectedEmail) return true;
  const sessionEmail = normalizeEmail(email);
  if (!sessionEmail) return true;
  return sessionEmail === expectedEmail;
}

/**
 * Ensures the reset/activate page is bound to the invite/recovery session —
 * never an unrelated browser session that would update the wrong password.
 *
 * Remount-safe for one-time codes: if exchange fails because the code was
 * already consumed, keep a matching recovery/invite session instead of clearing it.
 */
export function ResetPasswordSessionGate({
  children,
}: ResetPasswordSessionGateProps) {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GateStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const linkError = searchParams.get("error");
    if (linkError === "invalid" || linkError === "expired") {
      setErrorMessage(getAuthErrorMessage("RESET_LINK_INVALID"));
      setStatus("error");
      return;
    }

    let cancelled = false;
    const expectedEmail = normalizeEmail(searchParams.get("email"));

    async function finishReady() {
      if (!cancelled) setStatus("ready");
    }

    async function finishInvalid() {
      if (!cancelled) {
        setErrorMessage(getAuthErrorMessage("RESET_LINK_INVALID"));
        setStatus("error");
      }
    }

    async function acceptIfMatchingSession(
      supabase: ReturnType<typeof createClient>,
    ): Promise<boolean> {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;
      if (!sessionMatchesExpected(user.email, expectedEmail)) {
        await supabase.auth.signOut({ scope: "local" });
        return false;
      }
      await finishReady();
      return true;
    }

    async function establishSession() {
      const supabase = createClient();
      const material = hasInviteOrRecoveryMaterial(searchParams);
      const hasLinkMaterial = Boolean(
        (material.hashAccessToken && material.hashRefreshToken) ||
          material.code ||
          (material.tokenHash && material.type),
      );

      const {
        data: { user: existingUser },
      } = await supabase.auth.getUser();

      // Clear only an unrelated session (e.g. HR still logged in). Keep a
      // matching recovery/invite session so remounts can retry used OTPs safely.
      if (
        hasLinkMaterial &&
        existingUser &&
        !sessionMatchesExpected(existingUser.email, expectedEmail)
      ) {
        await supabase.auth.signOut({ scope: "local" });
      }

      if (material.hashAccessToken && material.hashRefreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: material.hashAccessToken,
          refresh_token: material.hashRefreshToken,
        });

        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}`,
        );

        if (!error && (await acceptIfMatchingSession(supabase))) return;
      }

      if (material.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(material.code);
        cleanUrl(window.location.pathname, new URLSearchParams(window.location.search));

        if (!error && (await acceptIfMatchingSession(supabase))) return;
        // Already-used code on remount: matching session from the first mount is enough.
        if (error && (await acceptIfMatchingSession(supabase))) return;
      }

      if (material.tokenHash && material.type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: material.tokenHash,
          type: material.type as EmailOtpType,
        });
        cleanUrl(window.location.pathname, new URLSearchParams(window.location.search));

        if (!error && (await acceptIfMatchingSession(supabase))) return;
        if (error && (await acceptIfMatchingSession(supabase))) return;
      }

      // No link material: allow an already-authenticated recovery session
      // (e.g. redirected from /auth/callback with cookies already set).
      if (!hasLinkMaterial && existingUser) {
        if (await acceptIfMatchingSession(supabase)) return;
        await finishInvalid();
        return;
      }

      if (await acceptIfMatchingSession(supabase)) return;
      await finishInvalid();
    }

    void establishSession();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-3 items-center py-10">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">Verifying your secure link…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-lg font-semibold tracking-tight">Link expired or invalid</h2>
          <p className="text-sm text-muted-foreground">
            Request a new invitation or reset link to continue setting your password.
          </p>
        </div>

        <AuthNotice variant="warning" title="Link unavailable">
          {errorMessage ?? getAuthErrorMessage("RESET_LINK_INVALID")}
        </AuthNotice>

        <Link
          href={AUTH_ROUTES.forgotPassword}
          className={cn(buttonVariants(), "w-full")}
        >
          Request a new reset link
        </Link>

        <Link
          href={AUTH_ROUTES.login}
          className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
