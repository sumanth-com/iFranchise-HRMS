"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import { runAuditRetentionAction, saveAuditSettingsAction } from "@/lib/audit/actions";
import { auditSettingsFormSchema } from "@/lib/validations/audit";
import type { AuditSettings } from "@/types/audit";
import type { z } from "zod";

type FormInput = z.input<typeof auditSettingsFormSchema>;

export function AuditSettingsForm({ settings, canEdit }: { settings: AuditSettings; canEdit: boolean }) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormInput>({
    resolver: zodResolver(auditSettingsFormSchema),
    defaultValues: { retentionDays: settings.retentionDays },
  });

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      const res = await saveAuditSettingsAction(values);
      if (res.success) toast.success("Retention settings saved");
      else toast.error(res.message);
    });
  }

  function runArchive() {
    startTransition(async () => {
      const res = await runAuditRetentionAction();
      if (res.success) toast.success(`Archived ${res.data} expired log(s)`);
      else toast.error(res.message);
    });
  }

  return (
    <div className="max-w-xl space-y-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h3 className="font-semibold">Retention Policy</h3>
          <p className="text-sm text-muted-foreground">
            Logs older than the retention period are soft-archived. Permanent deletion requires Super Admin approval.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="retentionDays">Retention Period (days)</Label>
          <Input
            id="retentionDays"
            type="number"
            min={30}
            max={3650}
            disabled={!canEdit}
            {...form.register("retentionDays")}
          />
        </div>
        {canEdit ? (
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Save Settings
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Only Super Admin can modify retention settings.</p>
        )}
      </form>

      {canEdit ? (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="font-semibold">Archive Expired Logs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Run retention now to soft-archive logs beyond the configured period.
          </p>
          <Button className="mt-4" variant="outline" disabled={isPending} onClick={runArchive}>
            {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Run Retention Archive
          </Button>
        </div>
      ) : null}
    </div>
  );
}
