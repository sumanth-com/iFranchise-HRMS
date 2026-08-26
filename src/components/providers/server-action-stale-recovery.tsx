"use client";

import { useEffect } from "react";

import {
  isStaleServerActionError,
  reloadForStaleServerAction,
} from "@/lib/errors/stale-server-action";

/** Reload once when Next.js reports a stale Server Action id after dev rebuilds. */
export function ServerActionStaleRecovery() {
  useEffect(() => {
    function handle(reason: unknown) {
      if (!isStaleServerActionError(reason)) return;
      console.error("[server-action-recovery] stale action id — reloading once", reason);
      reloadForStaleServerAction();
    }

    const onError = (event: ErrorEvent) => {
      handle(event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      handle(event.reason);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
