"use client";

import { useEffect } from "react";

import {
  isChunkLoadError,
  isStaleHmrModuleError,
  recoverFromChunkLoadError,
} from "@/lib/next/chunk-load-recovery";

/**
 * Catches stale Turbopack/Next chunk failures during client navigations and
 * silently reloads so users never see a blocking error when switching modules.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    function isRecoverableClientError(candidate: unknown) {
      return isChunkLoadError(candidate) || isStaleHmrModuleError(candidate);
    }

    function handleError(event: ErrorEvent) {
      const candidate = event.error ?? event.message;
      if (!isRecoverableClientError(candidate)) return;
      event.preventDefault();
      recoverFromChunkLoadError();
    }

    function handleRejection(event: PromiseRejectionEvent) {
      if (!isRecoverableClientError(event.reason)) return;
      event.preventDefault();
      recoverFromChunkLoadError();
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
