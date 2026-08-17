"use client";

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { AlertTriangle, Copy, KeyRound, Loader2, Plus } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { SystemPanel } from "@/components/system-admin/system-module-frame";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  createApiKeyAction,
  deleteApiKeyAction,
  listApiKeysAction,
  revokeApiKeyAction,
  rotateApiKeyAction,
} from "@/lib/system-admin/actions";
import {
  PUBLIC_API_SCOPE_GROUPS,
  type ApiRateLimitTier,
  type PublicApiScope,
} from "@/lib/public-api/constants";
import type { SystemApiKeyRow } from "@/lib/system-admin/services/api-key-types";
import { cn } from "@/lib/utils";

type ExpiryOption = "never" | "30d" | "90d" | "1y";

function expiryDateForOption(option: ExpiryOption): string | null {
  if (option === "never") return null;
  const days = option === "30d" ? 30 : option === "90d" ? 90 : 365;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function parseIpList(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function ApiKeyRevealDialog({
  open,
  title,
  secretLabel,
  rawKey,
  onDone,
}: {
  open: boolean;
  title: string;
  secretLabel: string;
  rawKey: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — copy the value manually");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onDone();
      }}
    >
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Store {secretLabel} now. It cannot be retrieved later.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p>
              This is the <strong>only time</strong> the full secret is shown. Applications using
              the previous secret will stop working after rotation.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Secret</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={rawKey}
                className="font-mono text-xs"
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleCopy}>
                <Copy className="mr-1 size-3.5" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onDone}>
            I&apos;ve saved the secret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysPanel({
  keys: initial,
  autoOpenCreate = false,
}: {
  keys: SystemApiKeyRow[];
  autoOpenCreate?: boolean;
}) {
  const [keys, setKeys] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(autoOpenCreate);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState<"production" | "sandbox">("production");
  const [scopes, setScopes] = useState<PublicApiScope[]>(["employees:read", "departments:read"]);
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>("never");
  const [ipText, setIpText] = useState("");
  const [rateLimitTier, setRateLimitTier] = useState<ApiRateLimitTier>("standard");
  const [customLimit, setCustomLimit] = useState("120");
  const [reveal, setReveal] = useState<{ name: string; rawKey: string } | null>(null);
  const [detail, setDetail] = useState<SystemApiKeyRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<SystemApiKeyRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemApiKeyRow | null>(null);

  useEffect(() => {
    setKeys(initial);
  }, [initial]);

  function reload() {
    startTransition(async () => {
      const result = await listApiKeysAction();
      if (result.success) setKeys(result.data);
    });
  }

  function toggleScope(scope: PublicApiScope) {
    setScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  }

  function handleCreate() {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (scopes.length === 0) {
      toast.error("Select at least one scope");
      return;
    }
    startTransition(async () => {
      const result = await createApiKeyAction({
        name: name.trim(),
        description: description.trim() || null,
        environment,
        scopes,
        allowedIps: parseIpList(ipText),
        expiresAt: expiryDateForOption(expiryOption),
        rateLimitTier,
        rateLimitPerMinute:
          rateLimitTier === "custom" ? Number.parseInt(customLimit, 10) || 60 : null,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setCreateOpen(false);
      setName("");
      setDescription("");
      setReveal({ name: name.trim(), rawKey: result.data.rawKey });
      reload();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {keys.length} key{keys.length === 1 ? "" : "s"} · only prefixes are stored in the list.
        </p>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" />
          Create API Key
        </Button>
      </div>

      <SystemPanel className="min-h-0 flex-1" bodyClassName="p-0">
        {keys.length === 0 ? (
          <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 text-center">
            <KeyRound className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No API keys yet</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              Create a least-privilege key for CRM or another system. The full secret is shown once.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{key.name}</p>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                        key.status === "active" && "bg-emerald-500/10 text-emerald-700",
                        key.status === "revoked" && "bg-red-500/10 text-red-700",
                        key.status === "expired" && "bg-amber-500/10 text-amber-700",
                      )}
                    >
                      {key.status}
                    </span>
                    <span className="text-[10px] font-medium uppercase text-muted-foreground">
                      {key.environment}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{key.keyPrefix}…</p>
                  <p className="text-xs text-muted-foreground">
                    {key.scopes.slice(0, 4).join(", ")}
                    {key.scopes.length > 4 ? ` +${key.scopes.length - 4}` : ""}
                    {" · "}
                    Created {formatDistanceToNow(parseISO(key.createdAt), { addSuffix: true })}
                    {" · "}
                    {key.lastUsedAt
                      ? `Last used ${formatDistanceToNow(parseISO(key.lastUsedAt), { addSuffix: true })}`
                      : "Never used"}
                    {" · "}
                    {key.usageCount} req
                    {key.expiresAt
                      ? ` · Expires ${format(parseISO(key.expiresAt), "d MMM yyyy")}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDetail(key)}>
                    View
                  </Button>
                  {key.status !== "revoked" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await rotateApiKeyAction(key.id);
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }
                          setReveal({ name: key.name, rawKey: result.data.rawKey });
                          reload();
                        })
                      }
                    >
                      Rotate
                    </Button>
                  ) : null}
                  {key.status === "active" ? (
                    <Button size="sm" variant="ghost" onClick={() => setRevokeTarget(key)}>
                      Revoke
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleteTarget(key)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SystemPanel>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create API key"
        description="Least privilege only. The secret is shown once."
        footer={
          <Button disabled={isPending} onClick={handleCreate}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Create key
          </Button>
        }
      >
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="api-key-name">Name</Label>
            <Input id="api-key-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="api-key-description">Description</Label>
            <Input
              id="api-key-description"
              value={description}
              placeholder="CRM production sync"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Select
                value={environment}
                onValueChange={(value) => value && setEnvironment(value as "production" | "sandbox")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="sandbox">Test / Sandbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Expiration</Label>
              <Select value={expiryOption} onValueChange={(value) => value && setExpiryOption(value as ExpiryOption)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">No expiry</SelectItem>
                  <SelectItem value="30d">30 days</SelectItem>
                  <SelectItem value="90d">90 days</SelectItem>
                  <SelectItem value="1y">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rate limit</Label>
              <Select
                value={rateLimitTier}
                onValueChange={(value) => value && setRateLimitTier(value as ApiRateLimitTier)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (60/min)</SelectItem>
                  <SelectItem value="high_volume">High volume (300/min)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rateLimitTier === "custom" ? (
              <div className="space-y-1.5">
                <Label>Requests / minute</Label>
                <Input value={customLimit} onChange={(event) => setCustomLimit(event.target.value)} />
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>IP allowlist (optional)</Label>
            <Input
              value={ipText}
              placeholder="203.0.113.10, 198.51.100.0"
              onChange={(event) => setIpText(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Scopes</Label>
            {PUBLIC_API_SCOPE_GROUPS.map((group) => (
              <div key={group.id} className="space-y-1">
                <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.scopes.map((scope) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => toggleScope(scope)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        scopes.includes(scope)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Write scopes can be granted now; write HTTP routes are not published in v1 yet.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(detail)}
        onOpenChange={(open) => (open ? undefined : setDetail(null))}
        title={detail?.name ?? "API key"}
      >
        {detail ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Prefix</dt>
              <dd className="font-mono">{detail.keyPrefix}…</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Environment</dt>
              <dd className="capitalize">{detail.environment}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="capitalize">{detail.status}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Usage</dt>
              <dd>{detail.usageCount} requests</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Scopes</dt>
              <dd>{detail.scopes.join(", ")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd>{format(parseISO(detail.createdAt), "d MMM yyyy, HH:mm")}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Last used</dt>
              <dd>
                {detail.lastUsedAt
                  ? format(parseISO(detail.lastUsedAt), "d MMM yyyy, HH:mm")
                  : "Never"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Expires</dt>
              <dd>
                {detail.expiresAt
                  ? format(parseISO(detail.expiresAt), "d MMM yyyy")
                  : "No expiry"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">IP allowlist</dt>
              <dd>{detail.allowedIps.length ? detail.allowedIps.join(", ") : "None"}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => (open ? undefined : setRevokeTarget(null))}
        title="Revoke API key"
        description="Applications using this key will immediately lose API access. This cannot be undone."
        footer={
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (!revokeTarget) return;
              startTransition(async () => {
                const result = await revokeApiKeyAction(revokeTarget.id);
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                toast.success("API key revoked");
                setRevokeTarget(null);
                reload();
              });
            }}
          >
            Revoke key
          </Button>
        }
      >
        <p className="text-sm">
          Revoke <span className="font-medium">{revokeTarget?.name}</span> ({revokeTarget?.keyPrefix}…)?
        </p>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => (open ? undefined : setDeleteTarget(null))}
        title="Delete API key"
        description="The key will be revoked and hidden from the list."
        footer={
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (!deleteTarget) return;
              startTransition(async () => {
                const result = await deleteApiKeyAction(deleteTarget.id);
                if (!result.success) {
                  toast.error(result.message);
                  return;
                }
                toast.success("API key deleted");
                setDeleteTarget(null);
                reload();
              });
            }}
          >
            Delete
          </Button>
        }
      >
        <p className="text-sm">Delete {deleteTarget?.name}?</p>
      </Modal>

      <ApiKeyRevealDialog
        open={Boolean(reveal)}
        title="Save your API key"
        secretLabel="this API key"
        rawKey={reveal?.rawKey ?? ""}
        onDone={() => setReveal(null)}
      />
    </div>
  );
}
