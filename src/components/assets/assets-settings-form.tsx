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
import { saveAssetSettingsAction } from "@/lib/assets/actions";
import {
  assetSettingsSchema,
  type AssetSettingsFormInput,
  type AssetSettingsFormValues,
} from "@/lib/validations/assets";
import type { AssetSettings } from "@/types/assets";

type Props = {
  settings: AssetSettings;
  canEdit: boolean;
};

export function AssetsSettingsForm({ settings, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<AssetSettingsFormInput, unknown, AssetSettingsFormValues>({
    resolver: zodResolver(assetSettingsSchema),
    defaultValues: settings,
  });

  const categories = form.watch("categories") ?? [];

  function onSubmit(values: AssetSettingsFormValues) {
    startTransition(async () => {
      const result = await saveAssetSettingsAction(values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      form.reset(result.data);
      toast.success("Asset settings saved");
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-full flex-col gap-6"
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Asset Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Numbering, reminders, categories, and QR preferences.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-medium">Asset Categories</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Used when classifying assets in inventory.
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
                  form.setValue("categories", next, { shouldDirty: true });
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
                      "categories",
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
                form.setValue("categories", [...categories, "New Category"], {
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Asset Number Prefix</Label>
            <Input
              disabled={!canEdit || isPending}
              {...form.register("assetPrefix")}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Return Days</Label>
            <Input
              type="number"
              min={1}
              disabled={!canEdit || isPending}
              {...form.register("defaultReturnDays")}
            />
          </div>
          <div className="space-y-2">
            <Label>Warranty Reminder (days)</Label>
            <Input
              type="number"
              min={1}
              disabled={!canEdit || isPending}
              {...form.register("warrantyReminderDays")}
            />
          </div>
          <div className="space-y-2">
            <Label>Maintenance Reminder (days)</Label>
            <Input
              type="number"
              min={1}
              disabled={!canEdit || isPending}
              {...form.register("maintenanceReminderDays")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-medium">Features</h2>
        <label className="flex items-start gap-3 rounded-lg border px-4 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-input"
            checked={Boolean(form.watch("enableQrCodes"))}
            disabled={!canEdit || isPending}
            onChange={(e) =>
              form.setValue("enableQrCodes", e.target.checked, { shouldDirty: true })
            }
          />
          <span>
            <span className="font-medium">Enable QR Codes</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Generate scannable QR codes for each asset
            </span>
          </span>
        </label>
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
