import type { WebhookEvent } from "@/lib/public-api/constants";

/**
 * Fire-and-forget webhook dispatch. This module is client-safe: it never
 * statically imports Node crypto / `server-only`. Server callers load the
 * dispatcher lazily; browser bundles no-op.
 */
export function emitHrmsWebhook(
  organizationId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
) {
  if (typeof window !== "undefined") return;

  void import("@/lib/public-api/webhooks")
    .then(({ dispatchWebhookEvent }) =>
      dispatchWebhookEvent(organizationId, event, payload),
    )
    .catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.error(
          "[webhooks]",
          error instanceof Error ? error.message : "dispatch failed",
        );
      }
    });
}
