"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/error-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  isChunkLoadError,
  recoverFromChunkLoadError,
} from "@/lib/next/chunk-load-recovery";

type AppRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function AppRouteError({ error, reset }: AppRouteErrorProps) {
  const isChunkError = isChunkLoadError(error);

  useEffect(() => {
    if (isChunkError) {
      recoverFromChunkLoadError();
      return;
    }
    console.error("[route-error]", error);
  }, [error, isChunkError]);

  if (isChunkError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <LoadingSpinner />
        <p className="text-sm text-muted-foreground">Loading the latest page…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <ErrorState
        title="Something went wrong"
        description="We couldn't load this page. Please try again, or contact your HR administrator if the problem continues."
        onRetry={reset}
        retryLabel="Try again"
      />
    </div>
  );
}
