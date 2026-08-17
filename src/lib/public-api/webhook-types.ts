import type { WebhookEvent } from "@/lib/public-api/constants";

export type SystemWebhookRow = {
  id: string;
  name: string;
  endpointUrl: string;
  events: WebhookEvent[];
  secretPrefix: string;
  isActive: boolean;
  lastDeliveryAt: string | null;
  lastDeliveryStatus: string | null;
  failureCount: number;
  createdAt: string;
};

export type WebhookDeliveryRow = {
  id: string;
  webhookId: string;
  eventType: string;
  requestId: string;
  deliveryStatus: string;
  responseStatus: number | null;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: string;
};
