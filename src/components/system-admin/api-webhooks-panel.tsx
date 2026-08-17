"use client";

import { format, parseISO } from "date-fns";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { SystemPanel } from "@/components/system-admin/system-module-frame";
import { Label } from "@/components/ui/label";
import {
  createWebhookAction,
  deleteWebhookAction,
  testWebhookAction,
  updateWebhookAction,
} from "@/lib/system-admin/actions";
import {
  WEBHOOK_EVENTS,
  WEBHOOK_EVENT_LABELS,
  type WebhookEvent,
} from "@/lib/public-api/constants";
import type { SystemWebhookRow, WebhookDeliveryRow } from "@/lib/public-api/webhook-types";
import { cn } from "@/lib/utils";
import { AlertTriangle, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ApiWebhooksPanel({
  webhooks: initialWebhooks,
  deliveries: initialDeliveries,
  enabled,
}: {
  webhooks: SystemWebhookRow[];
  deliveries: WebhookDeliveryRow[];
  enabled: boolean;
}) {
  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [deliveries] = useState(initialDeliveries);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<WebhookEvent[]>(["employee.created", "employee.updated"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleEvent(event: WebhookEvent) {
    setEvents((current) =>
      current.includes(event) ? current.filter((item) => item !== event) : [...current, event],
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      {!enabled ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Webhooks are disabled in API settings. Endpoints can still be managed, but events will not be delivered.
        </p>
      ) : null}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          HTTPS endpoints receive signed JSON events. Secrets are shown once.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          Create webhook
        </Button>
      </div>

      <SystemPanel title="Endpoints">
        {webhooks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No webhooks yet. Add an HTTPS URL for CRM employee sync events.
          </p>
        ) : (
          <ul className="divide-y">
            {webhooks.map((hook) => (
              <li key={hook.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold">{hook.name}</p>
                  <p className="font-mono text-xs break-all text-muted-foreground">{hook.endpointUrl}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {hook.isActive ? "Active" : "Inactive"} · {hook.events.join(", ")} · secret{" "}
                    {hook.secretPrefix}…
                    {hook.lastDeliveryAt
                      ? ` · last ${format(parseISO(hook.lastDeliveryAt), "d MMM HH:mm")} (${hook.lastDeliveryStatus ?? "—"})`
                      : " · never delivered"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await testWebhookAction(hook.id);
                        if (!result.success) toast.error(result.message);
                        else toast.success("Test event sent");
                      })
                    }
                  >
                    Send test
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await updateWebhookAction({
                          webhookId: hook.id,
                          isActive: !hook.isActive,
                        });
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }
                        setWebhooks((current) =>
                          current.map((item) =>
                            item.id === hook.id ? { ...item, isActive: !item.isActive } : item,
                          ),
                        );
                      })
                    }
                  >
                    {hook.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteWebhookAction(hook.id);
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }
                        setWebhooks((current) => current.filter((item) => item.id !== hook.id));
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SystemPanel>

      <SystemPanel title="Recent deliveries">
        {deliveries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Delivery attempts appear here. Payloads are summarized without secrets.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {deliveries.slice(0, 20).map((row) => (
              <li key={row.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  {row.eventType} · {row.deliveryStatus}
                  {row.responseStatus ? ` (${row.responseStatus})` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(parseISO(row.createdAt), "d MMM HH:mm:ss")} · {row.requestId.slice(0, 8)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SystemPanel>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create webhook"
        description="Use HTTPS. Localhost HTTP is allowed for development only."
        footer={
          <Button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await createWebhookAction({
                  name,
                  endpointUrl: url,
                  events,
                });
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                setCreateOpen(false);
                setName("");
                setUrl("");
                setSecret(result.data.rawSecret);
                setWebhooks((current) => [
                  {
                    id: result.data.id,
                    name,
                    endpointUrl: url,
                    events,
                    secretPrefix: result.data.prefix,
                    isActive: true,
                    lastDeliveryAt: null,
                    lastDeliveryStatus: null,
                    failureCount: 0,
                    createdAt: new Date().toISOString(),
                  },
                  ...current,
                ]);
              })
            }
          >
            Create webhook
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Endpoint URL</Label>
            <Input
              value={url}
              placeholder="https://crm.example.com/webhooks/hrms"
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Events</Label>
            <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
              {WEBHOOK_EVENTS.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs",
                    events.includes(event)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {WEBHOOK_EVENT_LABELS[event]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <Dialog open={Boolean(secret)} onOpenChange={(open) => (open ? undefined : setSecret(null))}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Save webhook secret</DialogTitle>
            <DialogDescription>Use this to verify X-HRMS-Signature. It cannot be retrieved later.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            Shown once. Store it in the receiving system.
          </div>
          <div className="flex gap-2">
            <Input readOnly value={secret ?? ""} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!secret) return;
                await navigator.clipboard.writeText(secret);
                toast.success("Copied");
              }}
            >
              <Copy className="size-3.5" />
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setSecret(null)}>I&apos;ve saved the secret</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
