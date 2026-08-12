"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/error-state";

type AppRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function AppRouteError({ error, reset }: AppRouteErrorProps) {
  const isChunkError =
    error.message.includes("Failed to load chunk") ||
    error.message.includes("Loading chunk") ||
    error.name === "ChunkLoadError";

  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  function handleRetry() {
    if (isChunkError) {
      window.location.reload();
      return;
    }
    reset();
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <ErrorState
        title={isChunkError ? "Page update in progress" : "Something went wrong"}
        description={
          isChunkError
            ? "The app was updated while this page was loading. Refresh to load the latest version."
            : "We couldn't load this page. Please try again, or contact your HR administrator if the problem continues."
        }
        onRetry={handleRetry}
        retryLabel={isChunkError ? "Refresh page" : "Try again"}
      />
    </div>
  );
}
