"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/error-state";

type AppRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export function AppRouteError({ error, reset }: AppRouteErrorProps) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

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
