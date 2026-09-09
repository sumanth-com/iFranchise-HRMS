"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ErrorState } from "@/components/common/error-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  isRecoverableRouteError,
  recoverFromChunkLoadError,
} from "@/lib/next/chunk-load-recovery";

type AppRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function isAuthServiceUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const name = "name" in error && typeof error.name === "string" ? error.name : "";
  const message =
    "message" in error && typeof error.message === "string" ? error.message : "";
  return (
    name === "AuthServiceUnavailableError" || message === "AUTH_SERVICE_UNAVAILABLE"
  );
}

export function AppRouteError({ error, reset }: AppRouteErrorProps) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const authRetryCount = useRef(0);
  const isAuthUnavailable = isAuthServiceUnavailableError(error);
  const isRecoverable = isRecoverableRouteError(error);
  const [reloadExhausted, setReloadExhausted] = useState(false);
  const [authRetrying, setAuthRetrying] = useState(isAuthUnavailable);

  useEffect(() => {
    // Always log the real exception — recovery must not hide the cause.
    console.error("[route-error]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      pathname,
      recoverable: isRecoverable,
      authUnavailable: isAuthUnavailable,
      stack: error.stack,
    });

    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      authRetryCount.current = 0;
      setReloadExhausted(false);
      setAuthRetrying(false);
      reset();
      return;
    }

    if (isAuthUnavailable && authRetryCount.current < 2) {
      authRetryCount.current += 1;
      setAuthRetrying(true);
      const timer = window.setTimeout(() => {
        reset();
      }, 1200 * authRetryCount.current);
      return () => window.clearTimeout(timer);
    }

    if (isAuthUnavailable) {
      setAuthRetrying(false);
    }

    if (isRecoverable) {
      const recovered = recoverFromChunkLoadError({ cause: error });
      if (!recovered) setReloadExhausted(true);
    }
  }, [error, isAuthUnavailable, isRecoverable, pathname, reset]);

  if ((isRecoverable && !reloadExhausted) || authRetrying) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">
          {authRetrying
            ? "Reconnecting to authentication…"
            : "Loading the latest page…"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <ErrorState
        title={isAuthUnavailable ? "Temporarily unavailable" : "Something went wrong"}
        description={
          isAuthUnavailable
            ? "We couldn't verify your session with the auth service. Your login was not cleared — please try again."
            : "We couldn't load this page. Please try again, or contact your HR administrator if the problem continues."
        }
        onRetry={() => {
          if (isRecoverable) {
            recoverFromChunkLoadError({ force: true, cause: error });
            return;
          }
          authRetryCount.current = 0;
          setAuthRetrying(false);
          reset();
        }}
        retryLabel="Try again"
      />
    </div>
  );
}
