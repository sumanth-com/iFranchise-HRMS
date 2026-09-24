"use client";

import { useEffect, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const APPROVALS_BROADCAST_CHANNEL = "hrms-approvals-sync";
const APPROVALS_STORAGE_KEY = "hrms_approval_last_sync";
const FOCUS_REFRESH_THROTTLE_MS = 30_000;

const DEFAULT_APPROVAL_TABLES = [
  "attendance_corrections",
  "leave_approvals",
  "leave_requests",
  "exit_resignations",
  "executive_approvals",
] as const;

export function broadcastApprovalChange(moduleName?: string) {
  if (typeof window === "undefined") return;

  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(APPROVALS_BROADCAST_CHANNEL);
      channel.postMessage({
        type: "approval_acted",
        module: moduleName ?? "general",
        timestamp: Date.now(),
      });
      channel.close();
    }
  } catch {
    // Ignore BroadcastChannel errors
  }

  try {
    window.localStorage.setItem(
      APPROVALS_STORAGE_KEY,
      JSON.stringify({
        module: moduleName ?? "general",
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Ignore localStorage errors
  }
}

type UseApprovalsSyncOptions = {
  onRefresh: () => void | Promise<void>;
  tables?: string[];
  pollIntervalMs?: number;
  enabled?: boolean;
};

export function useApprovalsSync({
  onRefresh,
  tables,
  /**
   * Periodic fallback poll. Default 0 (off): realtime + focus/visibility +
   * cross-tab broadcast already refresh. Enable only when a surface needs it.
   */
  pollIntervalMs = 0,
  enabled = true,
}: UseApprovalsSyncOptions) {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;
  const lastFocusRefreshAt = useRef(0);

  // Stabilize deps: callers often pass inline `tables={[...]}` which would
  // tear down/recreate realtime + focus listeners on every parent render.
  const tablesKey = useMemo(
    () => (tables ?? DEFAULT_APPROVAL_TABLES).join("|"),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: key from joined values
    [tables?.join("|")],
  );
  const resolvedTables = useMemo(
    () => tablesKey.split("|").filter(Boolean),
    [tablesKey],
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerRefresh = (force = false) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (document.visibilityState !== "visible") return;
        if (!force) {
          const now = Date.now();
          if (now - lastFocusRefreshAt.current < FOCUS_REFRESH_THROTTLE_MS) {
            return;
          }
          lastFocusRefreshAt.current = now;
        }
        void refreshRef.current();
      }, 200);
    };

    // 1. Cross-tab BroadcastChannel listener
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel(APPROVALS_BROADCAST_CHANNEL);
        broadcastChannel.onmessage = () => {
          triggerRefresh(true);
        };
      }
    } catch {
      broadcastChannel = null;
    }

    // 2. Cross-tab localStorage fallback listener
    const onStorage = (event: StorageEvent) => {
      if (event.key === APPROVALS_STORAGE_KEY) {
        triggerRefresh(true);
      }
    };
    window.addEventListener("storage", onStorage);

    // 3. Tab visibility / window focus listener (throttled)
    const onFocus = () => triggerRefresh(false);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh(false);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 4. Supabase Realtime channel subscription for instant cross-user / cross-portal sync
    const supabase = createClient();
    const channelName = `approvals-sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase.channel(channelName);

    for (const table of resolvedTables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "hrms",
          table,
        },
        () => {
          triggerRefresh(true);
        },
      );
    }

    channel.subscribe();

    // 5. Optional periodic polling (off by default — avoids competing RSC/action storms)
    const intervalId =
      pollIntervalMs > 0
        ? setInterval(() => {
            if (document.visibilityState === "visible") {
              lastFocusRefreshAt.current = Date.now();
              void refreshRef.current();
            }
          }, pollIntervalMs)
        : null;

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (intervalId) clearInterval(intervalId);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void supabase.removeChannel(channel);
    };
  }, [enabled, pollIntervalMs, tablesKey, resolvedTables]);
}
