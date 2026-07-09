"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { saveNotificationSettingsAction } from "@/lib/notifications/actions";
import {
  NOTIFICATION_MODULES,
  formatNotificationModule,
} from "@/lib/notifications/constants";
import { notificationSettingsFormSchema } from "@/lib/validations/notifications";
import type { NotificationSettings } from "@/types/notifications";
import type { z } from "zod";

type FormInput = z.input<typeof notificationSettingsFormSchema>;

type Props = {
  settings: NotificationSettings;
  canEdit: boolean;
};

export function NotificationSettingsForm({ settings, canEdit }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormInput>({
    resolver: zodResolver(notificationSettingsFormSchema),
    defaultValues: { typeSettings: settings.typeSettings },
  });

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      const res = await saveNotificationSettingsAction(values);
      if (res.success) toast.success("Settings saved");
      else toast.error(res.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="font-semibold">Delivery Channels by Type</h3>
          <p className="text-sm text-muted-foreground">
            Enable or disable in-app, email, and push delivery per notification module.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">In-App</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Push</th>
              </tr>
            </thead>
            <tbody>
              {NOTIFICATION_MODULES.map((mod) => {
                const channels = form.watch(`typeSettings.${mod.value}`);
                return (
                  <tr key={mod.value} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{formatNotificationModule(mod.value)}</td>
                    {(["inApp", "email", "push"] as const).map((channel) => (
                      <td key={channel} className="px-4 py-3">
                        <input
                          type="checkbox"
                          disabled={!canEdit}
                          checked={channels?.[channel] ?? false}
                          onChange={(e) =>
                            form.setValue(`typeSettings.${mod.value}.${channel}`, e.target.checked)
                          }
                          className="size-4 rounded border"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {canEdit ? (
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          Save Settings
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">You have view-only access to notification settings.</p>
      )}
    </form>
  );
}
