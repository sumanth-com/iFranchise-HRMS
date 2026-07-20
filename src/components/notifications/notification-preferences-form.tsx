"use client";

import { Loader2, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { saveNotificationPreferencesAction } from "@/lib/notifications/actions";
import { NOTIFICATION_SOUND_OPTIONS } from "@/lib/notifications/constants";
import { previewNotificationSound } from "@/lib/notifications/play-notification-sound";
import { useRegisterUnsavedChanges } from "@/providers/unsaved-changes-provider";
import { notificationPreferencesFormSchema } from "@/lib/validations/notifications";
import { cn } from "@/lib/utils";
import type { NotificationUserPreferences } from "@/types/notifications";
import type { z } from "zod";

type FormInput = z.input<typeof notificationPreferencesFormSchema>;

type Props = {
  preferences: NotificationUserPreferences;
};

const TOGGLES: { key: keyof FormInput; label: string; description: string }[] = [
  {
    key: "receiveInApp",
    label: "Receive In-App",
    description: "Show notifications in the notification center and bell.",
  },
  {
    key: "receiveEmail",
    label: "Receive Email",
    description: "Send email copies for enabled notification types.",
  },
  {
    key: "muteNotifications",
    label: "Mute Notifications",
    description: "Pause all notifications and sounds temporarily.",
  },
  {
    key: "dailyDigest",
    label: "Daily Digest",
    description: "Receive a daily summary email.",
  },
  {
    key: "weeklyDigest",
    label: "Weekly Digest",
    description: "Receive a weekly summary email.",
  },
];

export function NotificationPreferencesForm({ preferences }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormInput>({
    resolver: zodResolver(notificationPreferencesFormSchema),
    defaultValues: {
      receiveEmail: preferences.receiveEmail,
      receiveInApp: preferences.receiveInApp,
      muteNotifications: preferences.muteNotifications,
      notificationSound: preferences.notificationSound,
      dailyDigest: preferences.dailyDigest,
      weeklyDigest: preferences.weeklyDigest,
    },
  });

  useRegisterUnsavedChanges(
    "notification-preferences",
    "Notification preferences",
    form.formState.isDirty,
  );

  const selectedSound = form.watch("notificationSound");
  const isMuted = form.watch("muteNotifications");

  function onSubmit(values: FormInput) {
    startTransition(async () => {
      const res = await saveNotificationPreferencesAction(values);
      if (res.success) {
        form.reset(values);
        toast.success("Changes saved");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="border-b px-4 py-4">
          <h3 className="font-medium">Notification Sound</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the tone played when a new in-app notification arrives — or turn sound off.
          </p>
        </div>

        <div className="divide-y">
          {NOTIFICATION_SOUND_OPTIONS.map((option) => {
            const isSelected = selectedSound === option.value;
            const isOff = option.value === "off";

            return (
              <div
                key={option.value}
                className={cn(
                  "flex items-start justify-between gap-4 px-4 py-4 transition-colors",
                  isSelected && "bg-accent/30",
                )}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="notificationSound"
                    value={option.value}
                    checked={isSelected}
                    disabled={isMuted || isPending}
                    onChange={() =>
                      form.setValue("notificationSound", option.value, { shouldDirty: true })
                    }
                    className="mt-1 size-4 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </label>

                {isOff ? (
                  <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs text-muted-foreground">
                    <VolumeX className="size-3.5" />
                    Silent
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isMuted || isPending}
                    onClick={() => previewNotificationSound(option.value)}
                  >
                    <Volume2 className="mr-2 size-4" />
                    Preview
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {isMuted ? (
          <p className="border-t px-4 py-3 text-sm text-muted-foreground">
            Unmute notifications to preview and use notification sounds.
          </p>
        ) : null}
      </div>

      <div className="divide-y rounded-xl border bg-card shadow-sm">
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
              checked={Boolean(form.watch(toggle.key))}
              disabled={isPending}
              onChange={(e) => form.setValue(toggle.key, e.target.checked, { shouldDirty: true })}
            />
          </label>
        ))}
      </div>

      <Button type="submit" disabled={isPending || !form.formState.isDirty}>
        {isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
        Save Changes
      </Button>
    </form>
  );
}
