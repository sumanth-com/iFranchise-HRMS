"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";

import { LoadingSpinner } from "@/components/common/loading-spinner";
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

    async function establishSession() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        if (!cancelled) setStatus("ready");
        return;
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : "";
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
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
              if (!cancelled) setStatus("ready");
              return;
            }
          }
        }
      }

      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        cleanUrl(window.location.pathname, new URLSearchParams(window.location.search));

        if (!error) {
          const {
            data: { user: sessionUser },
          } = await supabase.auth.getUser();
          if (sessionUser) {
            if (!cancelled) setStatus("ready");
            return;
          }
        }
      }

      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        });
        cleanUrl(window.location.pathname, new URLSearchParams(window.location.search));

        if (!error) {
          const {
            data: { user: sessionUser },
          } = await supabase.auth.getUser();
          if (sessionUser) {
            if (!cancelled) setStatus("ready");
            return;
          }
        }
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
      <div className="flex flex-col items-center gap-3 py-10">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">Verifying your reset link...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-lg font-semibold">Reset link expired</h2>
          <p className="text-sm text-muted-foreground">
            {errorMessage ?? getAuthErrorMessage("RESET_LINK_INVALID")}
          </p>
        </div>

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
