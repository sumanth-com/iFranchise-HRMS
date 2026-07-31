"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/common/error-state";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center p-6">
          <ErrorState
            title="Something went wrong"
            description="We couldn't load this page. Please refresh or try again in a moment."
            onRetry={reset}
            retryLabel="Try again"
          />
        </div>
      </body>
    </html>
  );
}
