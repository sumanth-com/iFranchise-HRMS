"use client";

import { format } from "date-fns";
import { Eye, Loader2, Pencil } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  previewNotificationTemplateAction,
  saveNotificationTemplateAction,
} from "@/lib/notifications/actions";
import {
  NOTIFICATION_MODULES,
  formatNotificationModule,
} from "@/lib/notifications/constants";
import { notificationTemplateFormSchema } from "@/lib/validations/notifications";
import type { NotificationTemplateItem } from "@/types/notifications";

type FormInput = z.input<typeof notificationTemplateFormSchema>;

type Props = {
  templates: NotificationTemplateItem[];
  canEdit: boolean;
};

export function NotificationTemplatesManagement({ templates, canEdit }: Props) {
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState({ subject: "", body: "" });
  const [editing, setEditing] = useState<NotificationTemplateItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormInput>({
    resolver: zodResolver(notificationTemplateFormSchema),
    defaultValues: {
      templateKey: "",
      name: "",
      module: "system",
      subject: "",
      bodyTemplate: "",
      variables: [],
    },
  });

  const columns = useMemo<DataTableColumn<NotificationTemplateItem>[]>(
    () => [
      { key: "name", header: "Template", render: (row) => <span className="font-medium">{row.name}</span> },
      { key: "templateKey", header: "Key", render: (row) => <code className="text-xs">{row.templateKey}</code> },
      {
        key: "module",
        header: "Module",
        render: (row) => formatNotificationModule(row.module),
      },
      {
        key: "variables",
        header: "Variables",
        render: (row) => row.variables.join(", ") || "—",
      },
      {
        key: "updatedAt",
        header: "Updated",
        render: (row) => format(new Date(row.updatedAt), "dd MMM yyyy"),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Preview"
              onClick={() => {
                startTransition(async () => {
                  const vars = Object.fromEntries(row.variables.map((v) => [v, `Sample ${v}`]));
                  const res = await previewNotificationTemplateAction({
                    subject: row.subject,
                    bodyTemplate: row.bodyTemplate,
                    variables: vars,
                  });
                  if (res.success) {
                    setPreviewText(res.data);
                    setPreviewOpen(true);
                  } else toast.error(res.message);
                });
              }}
            >
              <Eye className="size-4" />
            </Button>
            {canEdit ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Edit"
                onClick={() => {
                  setEditing(row);
                  form.reset({
                    templateKey: row.templateKey,
                    name: row.name,
                    module: row.module,
                    subject: row.subject,
                    bodyTemplate: row.bodyTemplate,
                    variables: row.variables,
                  });
                  setOpen(true);
                }}
              >
                <Pencil className="size-4" />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canEdit, form],
  );

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      const res = await saveNotificationTemplateAction(values, editing?.id);
      if (res.success) {
        toast.success(editing ? "Template updated" : "Template saved");
        setOpen(false);
        setEditing(null);
      } else toast.error(res.message);
    });
  }

  return (
    <div className="space-y-4">
      {templates.length === 0 ? (
        <EmptyState title="No templates" description="Default templates will appear after migration." />
      ) : (
        <DataTable columns={columns} data={templates} />
      )}

      <Modal open={open} onOpenChange={setOpen} title={editing ? "Edit Template" : "New Template"}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="templateKey">Template Key</Label>
              <Input id="templateKey" {...form.register("templateKey")} disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Module</Label>
            <Select
              value={form.watch("module")}
              onValueChange={(value) => form.setValue("module", value as FormInput["module"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_MODULES.map((mod) => (
                  <SelectItem key={mod.value} value={mod.value}>
                    {mod.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...form.register("subject")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bodyTemplate">Message</Label>
            <textarea
              id="bodyTemplate"
              className="min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("bodyTemplate")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={previewOpen} onOpenChange={setPreviewOpen} title="Template Preview">
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Subject</p>
            <p className="mt-1 font-medium">{previewText.subject}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Message</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{previewText.body}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
