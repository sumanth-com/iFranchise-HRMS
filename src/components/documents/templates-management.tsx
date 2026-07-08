"use client";

import { format } from "date-fns";
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { DataTable, type DataTableColumn } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import { Input } from "@/components/common/input";
import { Modal } from "@/components/common/modal";
import { Label } from "@/components/ui/label";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import {
  deleteTemplateAction,
  saveTemplateAction,
} from "@/lib/documents/actions";
import {
  LETTER_TYPE_LABELS,
  LETTER_TYPE_OPTIONS,
  TEMPLATE_PLACEHOLDERS,
  canManageTemplates,
} from "@/lib/documents/constants";
import {
  templateFormSchema,
  type TemplateFormValues,
} from "@/lib/validations/documents";
import type { TemplateItem } from "@/types/documents";

type TemplateFormInput = {
  name: string;
  letterType: TemplateFormValues["letterType"];
  documentTypeCode: string;
  subject: string;
  bodyHtml: string;
  isDefault: boolean;
};

type Props = {
  templates: TemplateItem[];
  permissionCodes: string[];
};

export function TemplatesManagement({ templates, permissionCodes }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TemplateItem | null>(null);
  const [preview, setPreview] = useState<TemplateItem | null>(null);
  const canManage = canManageTemplates(permissionCodes);

  const form = useForm<TemplateFormInput>({
    resolver: zodResolver(templateFormSchema) as never,
    defaultValues: {
      name: "",
      letterType: "offer_letter",
      documentTypeCode: "OFFER_LETTER",
      subject: "",
      bodyHtml: "",
      isDefault: false,
    },
  });

  const openCreate = useCallback(() => {
    setEditing(null);
    form.reset({
      name: "",
      letterType: "offer_letter",
      documentTypeCode: "OFFER_LETTER",
      subject: "",
      bodyHtml: "<p>Dear {{employeeName}},</p><p></p><p>Regards,<br/>{{companyName}}</p>",
      isDefault: false,
    });
    setOpen(true);
  }, [form]);

  const openEdit = useCallback(
    (item: TemplateItem) => {
      setEditing(item);
      form.reset({
        name: item.name,
        letterType: item.letterType,
        documentTypeCode: item.documentTypeCode,
        subject: item.subject ?? "",
        bodyHtml: item.bodyHtml,
        isDefault: item.isDefault,
      });
      setOpen(true);
    },
    [form],
  );

  function onSave(values: TemplateFormInput) {
    startTransition(async () => {
      const result = await saveTemplateAction(values, editing?.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(editing ? "Template updated" : "Template created");
      setOpen(false);
      router.refresh();
    });
  }

  const onDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await deleteTemplateAction(id);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Template deleted");
        router.refresh();
      });
    },
    [router],
  );

  const columns = useMemo<DataTableColumn<TemplateItem & Record<string, unknown>>[]>(
    () => [
      { key: "name", header: "Template" },
      {
        key: "letterType",
        header: "Letter Type",
        render: (row) => LETTER_TYPE_LABELS[row.letterType],
      },
      {
        key: "isDefault",
        header: "Default",
        render: (row) => (row.isDefault ? "Yes" : "No"),
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
            <Button size="icon-sm" variant="ghost" onClick={() => setPreview(row)}>
              <Eye className="h-4 w-4" />
            </Button>
            {canManage ? (
              <>
                <Button size="icon-sm" variant="ghost" onClick={() => openEdit(row)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => onDelete(row.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : null}
          </div>
        ),
      },
    ],
    [canManage, onDelete, openEdit],
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reusable letter templates with employee and company placeholders.
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        ) : null}
      </div>

      <div className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        Supported placeholders:{" "}
        {TEMPLATE_PLACEHOLDERS.map((p) => (
          <code key={p} className="mr-2 rounded bg-muted px-1.5 py-0.5 text-xs">
            {`{{${p}}}`}
          </code>
        ))}
      </div>

      {templates.length === 0 ? (
        <EmptyState title="No templates" description="Create a letter template to get started." />
      ) : (
        <DataTable columns={columns} data={templates} />
      )}

      <Modal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit Template" : "Create Template"}
        contentClassName="sm:max-w-3xl"
        footer={
          <Button onClick={form.handleSubmit(onSave)} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Template
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Letter Type</Label>
              <LabeledSelect
                items={LETTER_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                value={form.watch("letterType")}
                onValueChange={(value) => {
                  const meta = LETTER_TYPE_OPTIONS.find((o) => o.value === value);
                  form.setValue("letterType", value as TemplateFormInput["letterType"]);
                  if (meta) form.setValue("documentTypeCode", meta.documentTypeCode);
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input {...form.register("subject")} />
          </div>
          <div className="space-y-2">
            <Label>Body (HTML)</Label>
            <textarea
              className="min-h-56 w-full rounded-md border bg-background px-3 py-2 text-sm"
              {...form.register("bodyHtml")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={Boolean(form.watch("isDefault"))}
              onChange={(e) => form.setValue("isDefault", e.target.checked)}
            />
            Set as default for this letter type
          </label>
        </div>
      </Modal>

      <Modal
        open={Boolean(preview)}
        onOpenChange={(next) => !next && setPreview(null)}
        title={preview?.name ?? "Preview"}
        contentClassName="sm:max-w-3xl"
      >
        {preview ? (
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
          />
        ) : null}
      </Modal>
    </>
  );
}
