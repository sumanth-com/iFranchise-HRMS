"use client";

import { useEffect, useState } from "react";

import { ErrorState } from "@/components/common/error-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  isRecoverableRouteError,
  recoverFromChunkLoadError,
} from "@/lib/next/chunk-load-recovery";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const isRecoverable = isRecoverableRouteError(error);
  const [reloadExhausted, setReloadExhausted] = useState(false);

  useEffect(() => {
    if (isRecoverable) {
      const recovered = recoverFromChunkLoadError();
      if (!recovered) setReloadExhausted(true);
      return;
    }
    console.error("[global-error]", error);
  }, [error, isRecoverable]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          {isRecoverable && !reloadExhausted ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <LoadingSpinner />
              <p className="text-sm text-muted-foreground">Loading the latest page…</p>
            </div>
          ) : (
            <ErrorState
              title="Something went wrong"
              description="We couldn't load this page. Please refresh or try again in a moment."
              onRetry={() => {
                if (isRecoverable) {
                  recoverFromChunkLoadError({ force: true });
                  return;
                }
                reset();
              }}
              retryLabel="Try again"
            />
          )}
        </div>
      </body>
    </html>
  );
}
