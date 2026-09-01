"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { AnnouncementIcon } from "@/components/employee/dashboard/celebrations-carousel-helpers";
import {
  deleteDashboardAnnouncementAction,
  listManagedDashboardAnnouncementsAction,
  saveDashboardAnnouncementAction,
  setDashboardAnnouncementPublishedAction,
} from "@/lib/dashboard/actions/dashboard-announcement-actions";
import { cn } from "@/lib/utils";
import type { DashboardAnnouncement } from "@/types/dashboard-announcement";
import {
  DASHBOARD_ANNOUNCEMENT_ICON_KEYS,
  type DashboardAnnouncementIconKey,
  type DashboardAnnouncementPriority,
} from "@/types/dashboard-announcement";

type FormState = {
  id?: string;
  title: string;
  message: string;
  iconKey: DashboardAnnouncementIconKey | "none";
  priority: DashboardAnnouncementPriority;
  isPublished: boolean;
  clearImage: boolean;
};

const EMPTY_FORM: FormState = {
  title: "",
  message: "",
  iconKey: "megaphone",
  priority: "normal",
  isPublished: true,
  clearImage: false,
};

export function DashboardAnnouncementsManager({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [items, setItems] = useState<DashboardAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DashboardAnnouncement | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function reload() {
    setLoading(true);
    const result = await listManagedDashboardAnnouncementsAction();
    setLoading(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    setItems(result.data);
  }

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open]);

  function startCreate() {
    setEditing({ ...EMPTY_FORM });
    setImageFile(null);
  }

  function startEdit(item: DashboardAnnouncement) {
    setEditing({
      id: item.id,
      title: item.title,
      message: item.message,
      iconKey: item.iconKey ?? "megaphone",
      priority: item.priority,
      isPublished: item.isPublished,
      clearImage: false,
    });
    setImageFile(null);
  }

  function submitForm() {
    if (!editing) return;
    startTransition(async () => {
      const formData = new FormData();
      if (editing.id) formData.set("id", editing.id);
      formData.set("title", editing.title);
      formData.set("message", editing.message);
      formData.set("iconKey", editing.iconKey);
      formData.set("priority", editing.priority);
      formData.set("isPublished", String(editing.isPublished));
      formData.set("clearImage", String(editing.clearImage));
      if (imageFile) formData.set("image", imageFile);

      const result = await saveDashboardAnnouncementAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(editing.id ? "Team update saved." : "Team update created.");
      setEditing(null);
      setImageFile(null);
      await reload();
      router.refresh();
    });
  }

  function togglePublish(item: DashboardAnnouncement) {
    startTransition(async () => {
      const result = await setDashboardAnnouncementPublishedAction(
        item.id,
        !item.isPublished,
      );
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(item.isPublished ? "Update unpublished." : "Update published.");
      await reload();
      router.refresh();
    });
  }

  function removeItem() {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    startTransition(async () => {
      const result = await deleteDashboardAnnouncementAction(targetId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Team update removed.");
      setDeleteTarget(null);
      await reload();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isPending) return;
        if (!nextOpen) setDeleteTarget(null);
        onOpenChange(nextOpen);
      }}
      title={deleteTarget ? "Remove this team update?" : "Team updates"}
      description={
        deleteTarget
          ? `“${deleteTarget.title}” will be removed from the dashboard card.`
          : "Write a short note for this dashboard card. This is separate from Organization announcements."
      }
      contentClassName="sm:max-w-2xl"
      showCancel={false}
      footer={
        deleteTarget ? undefined : (
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        )
      }
    >
      {editing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={editing.title}
              maxLength={120}
              onChange={(event) =>
                setEditing((current) =>
                  current ? { ...current, title: event.target.value } : current,
                )
              }
              placeholder="Short title"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <textarea
              value={editing.message}
              maxLength={500}
              rows={4}
              onChange={(event) =>
                setEditing((current) =>
                  current ? { ...current, message: event.target.value } : current,
                )
              }
              placeholder="Brief message for the team"
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select
                value={editing.priority}
                onChange={(event) =>
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          priority: event.target.value as DashboardAnnouncementPriority,
                        }
                      : current,
                  )
                }
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm"
              >
                <option value="normal">Normal</option>
                <option value="important">Important</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Icon</label>
              <select
                value={editing.iconKey}
                onChange={(event) =>
                  setEditing((current) =>
                    current
                      ? {
                          ...current,
                          iconKey: event.target
                            .value as FormState["iconKey"],
                        }
                      : current,
                  )
                }
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-sm"
              >
                <option value="none">None</option>
                {DASHBOARD_ANNOUNCEMENT_ICON_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Optional image</label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setImageFile(file);
                if (file) {
                  setEditing((current) =>
                    current ? { ...current, clearImage: false } : current,
                  );
                }
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={editing.isPublished}
                  onChange={(event) =>
                    setEditing((current) =>
                      current
                        ? { ...current, isPublished: event.target.checked }
                        : current,
                    )
                  }
                />
                Publish immediately
              </label>
              {editing.id ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    setImageFile(null);
                    setEditing((current) =>
                      current ? { ...current, clearImage: true } : current,
                    );
                  }}
                >
                  Remove current image
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => {
                setEditing(null);
                setImageFile(null);
              }}
            >
              Back
            </Button>
            <Button type="button" disabled={isPending} onClick={submitForm}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {editing.id ? "Save changes" : "Create update"}
            </Button>
          </div>
        </div>
      ) : deleteTarget ? (
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Remove “{deleteTarget.title}” from the dashboard card?
          </p>
          <p className="text-sm text-muted-foreground">
            This does not affect Organization announcements. You can create a new team
            update later if needed.
          </p>
          <div className="flex justify-end gap-2">
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
              onClick={removeItem}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Remove update
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button type="button" size="sm" className="gap-1.5" onClick={startCreate}>
              <Plus className="size-4" />
              New update
            </Button>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No team updates yet. Create one to show in this card.
            </p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border/70 bg-card px-3 py-2.5"
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                    <AnnouncementIcon iconKey={item.iconKey} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          item.isPublished
                            ? "bg-emerald-500/15 text-emerald-700"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.isPublished ? "Published" : "Draft"}
                      </span>
                      {item.priority === "important" ? (
                        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                          Important
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {item.message}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={isPending}
                      aria-label="Edit"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => togglePublish(item)}
                    >
                      {item.isPublished ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={isPending}
                      aria-label="Remove"
                      onClick={() => setDeleteTarget(item)}
                    >
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
