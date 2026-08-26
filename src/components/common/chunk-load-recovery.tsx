"use client";

import { useEffect } from "react";

import {
  clearChunkRecoveryStateIfHealthy,
  isRecoverableRouteError,
  recoverFromChunkLoadError,
} from "@/lib/next/chunk-load-recovery";

/**
 * Catches deploy/chunk/RSC skew during client navigations and performs a
 * bounded hard reload. Application bugs are left alone (error boundaries handle them).
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    clearChunkRecoveryStateIfHealthy();

    function handleError(event: ErrorEvent) {
      const candidate = event.error ?? event.message;
      // Always preserve the original exception in the console.
      if (!isRecoverableRouteError(candidate)) return;
      console.error("[chunk-recovery] window error (recoverable)", candidate);
      event.preventDefault();
      recoverFromChunkLoadError({ cause: candidate });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      if (!isRecoverableRouteError(event.reason)) return;
      console.error("[chunk-recovery] unhandledrejection (recoverable)", event.reason);
      event.preventDefault();
      recoverFromChunkLoadError({ cause: event.reason });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
