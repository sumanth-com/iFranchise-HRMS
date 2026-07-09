"use client";

import { Loader2 } from "lucide-react";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { saveNotificationPreferencesAction } from "@/lib/notifications/actions";
import { notificationPreferencesFormSchema } from "@/lib/validations/notifications";
import type { NotificationUserPreferences } from "@/types/notifications";
import type { z } from "zod";

type FormInput = z.input<typeof notificationPreferencesFormSchema>;

type Props = {
  preferences: NotificationUserPreferences;
};

const TOGGLES: { key: keyof FormInput; label: string; description: string }[] = [
  { key: "receiveInApp", label: "Receive In-App", description: "Show notifications in the notification center and bell." },
  { key: "receiveEmail", label: "Receive Email", description: "Send email copies for enabled notification types." },
  { key: "muteNotifications", label: "Mute Notifications", description: "Pause all notifications temporarily." },
  { key: "dailyDigest", label: "Daily Digest", description: "Receive a daily summary email." },
  { key: "weeklyDigest", label: "Weekly Digest", description: "Receive a weekly summary email." },
];

export function NotificationPreferencesForm({ preferences }: Props) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormInput>({
    resolver: zodResolver(notificationPreferencesFormSchema),
    defaultValues: {
      receiveEmail: preferences.receiveEmail,
      receiveInApp: preferences.receiveInApp,
      muteNotifications: preferences.muteNotifications,
      dailyDigest: preferences.dailyDigest,
      weeklyDigest: preferences.weeklyDigest,
    },
  });

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      const res = await saveNotificationPreferencesAction(values);
      if (res.success) toast.success("Preferences saved");
      else toast.error(res.message);
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
      <div className="rounded-xl border bg-card shadow-sm divide-y">
        {TOGGLES.map((toggle) => (
          <label
            key={toggle.key}
            className="flex cursor-pointer items-start justify-between gap-4 px-4 py-4"
          >
            <div>
              <p className="font-medium">{toggle.label}</p>
              <p className="text-sm text-muted-foreground">{toggle.description}</p>
            </div>
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border"
              checked={form.watch(toggle.key)}
              onChange={(e) => form.setValue(toggle.key, e.target.checked)}
            />
          </label>
        ))}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Save Preferences
      </Button>
    </form>
  );
}
