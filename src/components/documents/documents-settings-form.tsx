"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { StickyPageActions } from "@/components/common/sticky-layout";
import { Label } from "@/components/ui/label";
import { saveDocumentSettingsAction } from "@/lib/documents/actions";
import {
  documentSettingsSchema,
  type DocumentSettingsFormInput,
  type DocumentSettingsFormValues,
} from "@/lib/validations/documents";
import type { DocumentSettings } from "@/types/documents";

type Props = {
  settings: DocumentSettings;
  canEdit: boolean;
};

export function DocumentsSettingsForm({ settings, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<DocumentSettingsFormInput, unknown, DocumentSettingsFormValues>({
    resolver: zodResolver(documentSettingsSchema),
    defaultValues: settings,
  });

  const categories = form.watch("documentCategories") ?? [];
  const fileTypes = form.watch("allowedFileTypes") ?? [];

  function onSubmit(values: DocumentSettingsFormValues) {
    startTransition(async () => {
      const result = await saveDocumentSettingsAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      form.reset(result.data);
      toast.success("Document settings saved");
    });
  }

  function toggleFileType(type: string) {
    const next = fileTypes.includes(type)
      ? fileTypes.filter((t) => t !== type)
      : [...fileTypes, type];
    form.setValue("allowedFileTypes", next, { shouldDirty: true });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-full flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Document Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Categories, upload rules, numbering, verification, and retention.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-medium">Document Categories</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Used for organising document types in HR workflows.
        </p>
        <div className="space-y-2">
          {categories.map((category, index) => (
            <div key={`cat-${index}`} className="flex gap-2">
              <Input
                disabled={!canEdit || isPending}
                value={category}
                onChange={(e) => {
                  const next = [...categories];
                  next[index] = e.target.value;
                  form.setValue("documentCategories", next, { shouldDirty: true });
                }}
              />
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isPending || categories.length <= 1}
                  onClick={() => {
                    form.setValue(
                      "documentCategories",
                      categories.filter((_, i) => i !== index),
                      { shouldDirty: true },
                    );
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.setValue("documentCategories", [...categories, "New Category"], {
                  shouldDirty: true,
                })
              }
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-medium">Allowed File Types</h2>
        <p className="mb-4 text-xs text-muted-foreground">PDF, PNG, JPG, JPEG</p>
        <div className="flex flex-wrap gap-3">
          {["pdf", "png", "jpg", "jpeg"].map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={fileTypes.includes(type)}
                disabled={!canEdit || isPending}
                onChange={() => toggleFileType(type)}
              />
              .{type}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Maximum Upload Size (MB)</Label>
            <Input
              type="number"
              min={1}
              max={50}
              disabled={!canEdit || isPending}
              {...form.register("maxUploadSizeMb")}
            />
          </div>
          <div className="space-y-2">
            <Label>Document Number Prefix</Label>
            <Input
              disabled={!canEdit || isPending}
              {...form.register("documentNumberPrefix")}
            />
          </div>
          <div className="space-y-2">
            <Label>Retention Period (days)</Label>
            <Input
              type="number"
              min={30}
              disabled={!canEdit || isPending}
              {...form.register("retentionPeriodDays")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Automation & Access</h2>
        {(
          [
            ["autoVerification", "Auto Verification", "Mark uploads as verified automatically"],
            [
              "requireHrApprovalForLetters",
              "Require HR Approval Before Publishing Official Letters",
              "Generated letters stay pending until published",
            ],
            [
              "enableEmployeeDownloads",
              "Enable Employee Downloads",
              "Allow employees to download their own documents",
            ],
          ] as const
        ).map(([name, label, description]) => (
          <label key={name} className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-input"
              checked={Boolean(form.watch(name))}
              disabled={!canEdit || isPending}
              onChange={(e) => form.setValue(name, e.target.checked, { shouldDirty: true })}
            />
            <span>
              <span className="font-medium">{label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
            </span>
          </label>
        ))}
      </section>

      {canEdit ? (
        <StickyPageActions>
          <Button
            type="button"
            variant="outline"
            disabled={!form.formState.isDirty || isPending}
            onClick={() => form.reset(settings)}
          >
            Cancel changes
          </Button>
          <Button type="submit" disabled={!form.formState.isDirty || isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Settings
          </Button>
        </StickyPageActions>
      ) : null}
    </form>
  );
}
