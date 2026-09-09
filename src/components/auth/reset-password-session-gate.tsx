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

/**
 * Ensures the reset/activate page is bound to the invite/recovery session —
 * never an unrelated browser session that would update the wrong password.
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

      // Invite/recovery links must always be consumed. An existing HR/admin
      // (or stale) session must not short-circuit and steal the password update.
      if (hasLinkMaterial && existingUser) {
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

        if (!error) {
          const {
            data: { user: sessionUser },
          } = await supabase.auth.getUser();
          if (sessionUser) {
            if (
              expectedEmail &&
              normalizeEmail(sessionUser.email) &&
              normalizeEmail(sessionUser.email) !== expectedEmail
            ) {
              await supabase.auth.signOut({ scope: "local" });
              if (!cancelled) {
                setErrorMessage(getAuthErrorMessage("RESET_LINK_INVALID"));
                setStatus("error");
              }
              return;
            }
            if (!cancelled) setStatus("ready");
            return;
          }
        }
      }

      if (material.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(material.code);
        cleanUrl(window.location.pathname, new URLSearchParams(window.location.search));

        if (!error) {
          const {
            data: { user: sessionUser },
          } = await supabase.auth.getUser();
          if (sessionUser) {
            if (
              expectedEmail &&
              normalizeEmail(sessionUser.email) &&
              normalizeEmail(sessionUser.email) !== expectedEmail
            ) {
              await supabase.auth.signOut({ scope: "local" });
              if (!cancelled) {
                setErrorMessage(getAuthErrorMessage("RESET_LINK_INVALID"));
                setStatus("error");
              }
              return;
            }
            if (!cancelled) setStatus("ready");
            return;
          }
        }
      }

      if (material.tokenHash && material.type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: material.tokenHash,
          type: material.type as EmailOtpType,
        });
        cleanUrl(window.location.pathname, new URLSearchParams(window.location.search));

        if (!error) {
          const {
            data: { user: sessionUser },
          } = await supabase.auth.getUser();
          if (sessionUser) {
            if (
              expectedEmail &&
              normalizeEmail(sessionUser.email) &&
              normalizeEmail(sessionUser.email) !== expectedEmail
            ) {
              await supabase.auth.signOut({ scope: "local" });
              if (!cancelled) {
                setErrorMessage(getAuthErrorMessage("RESET_LINK_INVALID"));
                setStatus("error");
              }
              return;
            }
            if (!cancelled) setStatus("ready");
            return;
          }
        }
      }

      // No link material: allow an already-authenticated recovery session
      // (e.g. redirected from /auth/callback with cookies already set).
      if (!hasLinkMaterial && existingUser) {
        if (
          expectedEmail &&
          normalizeEmail(existingUser.email) &&
          normalizeEmail(existingUser.email) !== expectedEmail
        ) {
          await supabase.auth.signOut({ scope: "local" });
          if (!cancelled) {
            setErrorMessage(getAuthErrorMessage("RESET_LINK_INVALID"));
            setStatus("error");
          }
          return;
        }
        if (!cancelled) setStatus("ready");
        return;
      }

      // Re-check after exchanges in case callback already planted cookies.
      const {
        data: { user: finalUser },
      } = await supabase.auth.getUser();
      if (finalUser) {
        if (
          expectedEmail &&
          normalizeEmail(finalUser.email) &&
          normalizeEmail(finalUser.email) !== expectedEmail
        ) {
          await supabase.auth.signOut({ scope: "local" });
          if (!cancelled) {
            setErrorMessage(getAuthErrorMessage("RESET_LINK_INVALID"));
            setStatus("error");
          }
          return;
        }
        if (!cancelled) setStatus("ready");
        return;
      }

      if (!cancelled) {
        setErrorMessage(getAuthErrorMessage("RESET_LINK_INVALID"));
        setStatus("error");
      }
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
