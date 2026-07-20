"use client";

import { Loader2, Volume2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import {
  saveCeoAlertPreferencesAction,
  saveCeoPreferencesAction,
} from "@/lib/ceo/actions/ceo-profile-actions";
import { NOTIFICATION_SOUND_OPTIONS } from "@/lib/notifications/constants";
import { previewNotificationSound } from "@/lib/notifications/play-notification-sound";
import { cn } from "@/lib/utils";
import type { CeoAlertPreferences, CeoUserPreferences } from "@/types/ceo-profile";
import type { NotificationSoundTone } from "@/types/notifications";

const USEFUL_ALERTS: {
  key: keyof CeoAlertPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "approvals",
    label: "Pending approvals",
    description: "Alert when executive approvals need your decision.",
  },
  {
    key: "executiveAlerts",
    label: "Critical executive alerts",
    description: "High-priority company and leadership signals.",
  },
  {
    key: "payrollAlerts",
    label: "Payroll alerts",
    description: "Payroll exceptions and release readiness.",
  },
  {
    key: "companyAnnouncements",
    label: "Company announcements",
    description: "Board and organization-wide updates.",
  },
  {
    key: "emailNotifications",
    label: "Email delivery",
    description: "Also send important alerts to your work email.",
  },
];

export function CeoProfilePreferencesSection({
  preferences,
  onUpdated,
}: {
  preferences: CeoUserPreferences;
  onUpdated: () => void;
}) {
  const { setTheme } = useTheme();
  const [form, setForm] = useState(preferences);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveCeoPreferencesAction(form);
      if (result.success) {
        setTheme(form.theme);
        toast.success(result.message);
        onUpdated();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <section id="preferences" className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Appearance</h2>
          <p className="text-xs text-muted-foreground">
            Choose how the portal looks. Changes apply instantly.
          </p>
        </div>
        <Button type="button" size="sm" disabled={isPending} onClick={save}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save
        </Button>
      </div>

      <div className="max-w-xs">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Theme
        </label>
        <Select
          value={form.theme}
          onValueChange={(value) => {
            if (!value) return;
            const nextTheme = value as CeoUserPreferences["theme"];
            setForm((prev) => ({ ...prev, theme: nextTheme }));
            setTheme(nextTheme);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="dark">Dark</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  );
}

export function CeoProfileNotificationSection({
  alertPreferences,
  preferences,
  onUpdated,
}: {
  alertPreferences: CeoAlertPreferences;
  preferences: CeoUserPreferences;
  onUpdated: () => void;
}) {
  const [alerts, setAlerts] = useState(alertPreferences);
  const [sound, setSound] = useState(preferences.notificationSound);
  const [prefs, setPrefs] = useState(preferences);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const nextPrefs = { ...prefs, notificationSound: sound };
      const [prefsResult, alertsResult] = await Promise.all([
        saveCeoPreferencesAction(nextPrefs),
        saveCeoAlertPreferencesAction(alerts),
      ]);
      if (!prefsResult.success) {
        toast.error(prefsResult.message);
        return;
      }
      if (!alertsResult.success) {
        toast.error(alertsResult.message);
        return;
      }
      setPrefs(nextPrefs);
      toast.success("Notification settings saved.");
      onUpdated();
    });
  }

  return (
    <section id="notifications" className="space-y-3">
      <div className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Notification sound</h2>
            <p className="text-xs text-muted-foreground">
              Choose one of three tones for new in-app alerts.
            </p>
          </div>
          <Button type="button" size="sm" disabled={isPending} onClick={save}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>

        <div className="divide-y rounded-lg border">
          {NOTIFICATION_SOUND_OPTIONS.map((option) => {
            const selected = sound === option.value;
            return (
              <div
                key={option.value}
                className={cn(
                  "flex items-start justify-between gap-3 px-3 py-3",
                  selected && "bg-accent/40",
                )}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="ceo-notification-sound"
                    className="mt-1 size-4 shrink-0"
                    checked={selected}
                    disabled={isPending}
                    onChange={() => setSound(option.value)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </label>
                {option.value === "off" ? (
                  <span className="inline-flex h-8 shrink-0 items-center rounded-lg border px-3 text-xs text-muted-foreground">
                    Silent
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={isPending}
                    onClick={() =>
                      previewNotificationSound(option.value as NotificationSoundTone)
                    }
                  >
                    <Volume2 className="size-3.5" />
                    Preview
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-semibold tracking-tight">Alert categories</h2>
          <p className="text-xs text-muted-foreground">
            Only the channels executives usually need day to day.
          </p>
        </div>
        <div className="divide-y rounded-lg border">
          {USEFUL_ALERTS.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-start justify-between gap-3 px-3 py-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {item.description}
                </span>
              </span>
              <input
                type="checkbox"
                className="mt-1 size-4 shrink-0"
                checked={alerts[item.key]}
                disabled={isPending}
                onChange={(event) =>
                  setAlerts((prev) => ({
                    ...prev,
                    [item.key]: event.target.checked,
                  }))
                }
              />
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
