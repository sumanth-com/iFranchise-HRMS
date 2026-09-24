"use client";

import { useEffect, useState } from "react";

import { ErrorState } from "@/components/common/error-state";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import {
  PAGE_LOAD_ERROR_DESCRIPTION,
  PAGE_LOAD_ERROR_TITLE,
  SECTION_LOAD_RETRY_LABEL,
} from "@/lib/errors/employee-facing";
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
    console.error("[global-error]", {
      name: error.name,
      message: error.message,
      digest: error.digest,
      recoverable: isRecoverable,
      stack: error.stack,
    });

    if (isRecoverable) {
      const recovered = recoverFromChunkLoadError({ cause: error });
      if (!recovered) setReloadExhausted(true);
    }
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
              title={PAGE_LOAD_ERROR_TITLE}
              description={PAGE_LOAD_ERROR_DESCRIPTION}
              onRetry={() => {
                if (isRecoverable) {
                  recoverFromChunkLoadError({ force: true, cause: error });
                  return;
                }
                reset();
              }}
              retryLabel={SECTION_LOAD_RETRY_LABEL}
            />
          )}
        </div>
      </body>
    </html>
  );
}
