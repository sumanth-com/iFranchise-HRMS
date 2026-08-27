"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const APPROVALS_BROADCAST_CHANNEL = "hrms-approvals-sync";
const APPROVALS_STORAGE_KEY = "hrms_approval_last_sync";

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
  tables = [
    "attendance_corrections",
    "leave_approvals",
    "leave_requests",
    "exit_resignations",
    "executive_approvals",
  ],
  pollIntervalMs = 12000,
  enabled = true,
}: UseApprovalsSyncOptions) {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const triggerRefresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (document.visibilityState === "visible") {
          void refreshRef.current();
        }
      }, 200);
    };

    // 1. Cross-tab BroadcastChannel listener
    let broadcastChannel: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        broadcastChannel = new BroadcastChannel(APPROVALS_BROADCAST_CHANNEL);
        broadcastChannel.onmessage = () => {
          triggerRefresh();
        };
      }
    } catch {
      broadcastChannel = null;
    }

    // 2. Cross-tab localStorage fallback listener
    const onStorage = (event: StorageEvent) => {
      if (event.key === APPROVALS_STORAGE_KEY) {
        triggerRefresh();
      }
    };
    window.addEventListener("storage", onStorage);

    // 3. Tab visibility / window focus listener
    const onFocus = () => triggerRefresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 4. Supabase Realtime channel subscription for instant cross-user / cross-portal sync
    const supabase = createClient();
    const channelName = `approvals-sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const channel = supabase.channel(channelName);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "hrms",
          table,
        },
        () => {
          triggerRefresh();
        },
      );
    }

    channel.subscribe();

    // 5. Periodic polling while tab is open as fallback
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshRef.current();
      }
    }, pollIntervalMs);

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
  }, [enabled, pollIntervalMs, tables]);
}
