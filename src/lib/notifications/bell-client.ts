import type { getNotificationBellDataAction } from "@/lib/notifications/actions";

export async function fetchNotificationBellData(): ReturnType<typeof getNotificationBellDataAction> {
  const response = await fetch("/api/notifications/bell", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Failed to load notifications (${response.status})`);
  return response.json();
}

/** An older poll must not undo a newer poll or a completed read-state change. */
export function createNotificationBellReader(load = fetchNotificationBellData) {
  let sequence = 0;
  return {
    async read() {
      const request = ++sequence;
      const result = await load();
      return request === sequence ? result : null;
    },
    invalidate() { sequence++; },
  };
}
