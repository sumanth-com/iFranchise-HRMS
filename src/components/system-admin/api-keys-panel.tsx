"use client";

import { format, formatDistanceToNow, parseISO } from "date-fns";
import { AlertTriangle, Copy, KeyRound, Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
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
import { SystemModuleFrame, SystemPanel } from "@/components/system-admin/system-module-frame";
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
import type { SystemApiKeyRow } from "@/lib/system-admin/services/api-keys-service";
import { cn } from "@/lib/utils";

type PermissionLevel = "read" | "read_write" | "admin";
type ExpiryOption = "never" | "30d" | "90d" | "1y";

function permissionsForLevel(level: PermissionLevel): string[] {
  if (level === "read") return ["read"];
  if (level === "read_write") return ["read", "write"];
  return ["read", "write", "admin"];
}

function expiryDateForOption(option: ExpiryOption): string | null {
  if (option === "never") return null;
  const days = option === "30d" ? 30 : option === "90d" ? 90 : 365;
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function formatPermissions(permissions: string[]): string {
  if (permissions.includes("admin") || permissions.includes("write")) {
    return permissions.includes("admin") ? "Full access" : "Read & write";
  }
  return "Read only";
}

function ApiKeyRevealDialog({
  open,
  keyName,
  rawKey,
  onDone,
}: {
  open: boolean;
  keyName: string;
  rawKey: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      toast.success("API key copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — copy the key manually");
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
          <DialogTitle>Save your API key</DialogTitle>
          <DialogDescription>
            Your new key for <span className="font-medium text-foreground">{keyName}</span> is ready.
            Store it somewhere secure before closing this dialog.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            <p>
              This is the <strong>only time</strong> your full API key will be shown. Copy it now — you
              cannot view or recover it later. If lost, rotate or create a new key.
            </p>
          </div>

          <div className="space-y-2">
            <Label>API key</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={rawKey}
                className="font-mono text-xs"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={handleCopy}>
                <Copy className="mr-1 size-3.5" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Prefix shown in the list: <span className="font-mono">{rawKey.slice(0, 14)}…</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onDone}>
            I&apos;ve saved the key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ApiKeysPanel({ keys: initial }: { keys: SystemApiKeyRow[] }) {
  const [keys, setKeys] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>("read");
  const [expiryOption, setExpiryOption] = useState<ExpiryOption>("never");

  const [revealOpen, setRevealOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedKeyName, setRevealedKeyName] = useState("");

  const [rotateTarget, setRotateTarget] = useState<SystemApiKeyRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<SystemApiKeyRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SystemApiKeyRow | null>(null);

  function reload() {
    startTransition(async () => {
      const res = await listApiKeysAction();
      if (res.success) setKeys(res.data);
    });
  }

  function resetCreateForm() {
    setName("");
    setPermissionLevel("read");
    setExpiryOption("never");
  }

  function showRevealedKey(keyName: string, rawKey: string) {
    setRevealedKeyName(keyName);
    setRevealedKey(rawKey);
    setRevealOpen(true);
  }

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter a name for this API key");
      return;
    }

    startTransition(async () => {
      const res = await createApiKeyAction({
        name: trimmed,
        permissions: permissionsForLevel(permissionLevel),
        allowedIps: [],
        expiresAt: expiryDateForOption(expiryOption),
      });

      if (res.success) {
        setCreateOpen(false);
        resetCreateForm();
        reload();
        showRevealedKey(trimmed, res.data.rawKey);
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleRotateConfirm() {
    if (!rotateTarget) return;

    startTransition(async () => {
      const res = await rotateApiKeyAction(rotateTarget.id);
      if (res.success) {
        const targetName = rotateTarget.name;
        setRotateTarget(null);
        reload();
        showRevealedKey(targetName, res.data.rawKey);
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleRevokeConfirm() {
    if (!revokeTarget) return;

    startTransition(async () => {
      const res = await revokeApiKeyAction(revokeTarget.id);
      if (res.success) {
        setRevokeTarget(null);
        toast.success("API key revoked");
        reload();
      } else {
        toast.error(res.message);
      }
    });
  }

  function handleDeleteConfirm() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const res = await deleteApiKeyAction(deleteTarget.id);
      if (res.success) {
        setDeleteTarget(null);
        toast.success("API key deleted");
        reload();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <SystemModuleFrame
      title="API Keys"
      description="Create secret keys for integrations and automation. Keys are shown once at creation — store them securely."
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex shrink-0 items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {keys.length} key{keys.length === 1 ? "" : "s"} · only prefixes are stored in the list
          </p>
          <Button size="sm" onClick={() => setCreateOpen(true)} disabled={isPending}>
            <Plus className="mr-1 size-3.5" />
            Create new API key
          </Button>
        </div>

        <SystemPanel className="min-h-0 flex-1 overflow-hidden">
          {keys.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <KeyRound className="size-8 opacity-40" />
              <p>No API keys yet</p>
              <p className="text-xs">Create a key to connect external services to your HRMS.</p>
            </div>
          ) : (
            <ul className="max-h-[280px] space-y-2 overflow-y-auto">
              {keys.map((key) => (
                <li
                  key={key.id}
                  className="rounded-lg border p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{key.name}</p>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            key.status === "active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {key.status}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {key.keyPrefix}…
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatPermissions(key.permissions)}</span>
                        <span>
                          Created {formatDistanceToNow(parseISO(key.createdAt), { addSuffix: true })}
                        </span>
                        {key.lastUsedAt ? (
                          <span>
                            Last used {formatDistanceToNow(parseISO(key.lastUsedAt), { addSuffix: true })}
                          </span>
                        ) : (
                          <span>Never used</span>
                        )}
                        {key.expiresAt ? (
                          <span>Expires {format(parseISO(key.expiresAt), "dd MMM yyyy")}</span>
                        ) : null}
                        <span>Used {key.usageCount}x</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      {key.status === "active" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => setRotateTarget(key)}
                          >
                            Rotate
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => setRevokeTarget(key)}
                          >
                            Revoke
                          </Button>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => setDeleteTarget(key)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SystemPanel>
      </div>

      <Modal
        open={createOpen}
        onOpenChange={(open) => {
          if (!isPending) {
            setCreateOpen(open);
            if (!open) resetCreateForm();
          }
        }}
        title="Create a new API key"
        description="Name your key and choose access level. You will see the full secret only once after creation."
        showCancel
        cancelLabel="Cancel"
        footer={
          <Button type="button" disabled={isPending || !name.trim()} onClick={handleCreate}>
            {isPending ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
            Create API key
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api-key-name">Name</Label>
            <Input
              id="api-key-name"
              placeholder="e.g. Payroll sync, Mobile app"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              A descriptive name to identify this key in your organization.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <Select
              value={permissionLevel}
              onValueChange={(value) => setPermissionLevel(value as PermissionLevel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read only — fetch data without changes</SelectItem>
                <SelectItem value="read_write">Read & write — create and update records</SelectItem>
                <SelectItem value="admin">Full access — all API operations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Expiration</Label>
            <Select
              value={expiryOption}
              onValueChange={(value) => setExpiryOption(value as ExpiryOption)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never expires</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
                <SelectItem value="1y">1 year</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Expired keys are rejected automatically. Rotate before expiry to avoid downtime.
            </p>
          </div>
        </div>
      </Modal>

      {revealedKey ? (
        <ApiKeyRevealDialog
          open={revealOpen}
          keyName={revealedKeyName}
          rawKey={revealedKey}
          onDone={() => {
            setRevealOpen(false);
            setRevealedKey(null);
            setRevealedKeyName("");
          }}
        />
      ) : null}

      <Dialog open={Boolean(rotateTarget)} onOpenChange={(open) => !open && setRotateTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rotate API key?</DialogTitle>
            <DialogDescription>
              {rotateTarget
                ? `A new secret will be generated for "${rotateTarget.name}". The current key stops working immediately — update any apps using it.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setRotateTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isPending} onClick={handleRotateConfirm}>
              {isPending ? "Rotating…" : "Rotate key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Revoke API key?</DialogTitle>
            <DialogDescription>
              {revokeTarget
                ? `Applications using "${revokeTarget.name}" will lose access immediately. The key stays in the list until you delete it.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setRevokeTarget(null)}
            >
              Cancel
            </Button>
            <Button type="button" disabled={isPending} onClick={handleRevokeConfirm}>
              {isPending ? "Revoking…" : "Revoke key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete API key?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `"${deleteTarget.name}" will be permanently removed from your organization. This cannot be undone.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleDeleteConfirm}
            >
              {isPending ? "Deleting…" : "Delete key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SystemModuleFrame>
  );
}
