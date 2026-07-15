"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
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
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { NOTIFICATION_SOUND_OPTIONS } from "@/lib/notifications/constants";
import type { CeoAlertPreferences, CeoUserPreferences } from "@/types/ceo-profile";

const LANDING_OPTIONS = [
  { value: CEO_ROUTES.home, label: "CEO Dashboard" },
  { value: CEO_ROUTES.approvals, label: "Approvals" },
  { value: CEO_ROUTES.analytics, label: "Analytics" },
  { value: CEO_ROUTES.reports, label: "Reports" },
  { value: CEO_ROUTES.notifications, label: "Notifications" },
];

const ALERT_TOGGLES: {
  key: keyof CeoAlertPreferences;
  label: string;
}[] = [
  { key: "executiveAlerts", label: "Executive Alerts" },
  { key: "payrollAlerts", label: "Payroll Alerts" },
  { key: "recruitmentAlerts", label: "Recruitment Alerts" },
  { key: "attendanceAlerts", label: "Attendance Alerts" },
  { key: "performanceAlerts", label: "Performance Alerts" },
  { key: "approvals", label: "Approvals" },
  { key: "companyAnnouncements", label: "Company Announcements" },
  { key: "emailNotifications", label: "Email Notifications" },
  { key: "pushNotifications", label: "Push Notifications" },
  { key: "desktopNotifications", label: "Desktop Notifications" },
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
    <section id="preferences" className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Theme, language, formats, and default landing experience.
          </p>
        </div>
        <Button type="button" size="sm" disabled={isPending} onClick={save}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save Preferences
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Theme</label>
          <Select
            value={form.theme}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({ ...prev, theme: value as CeoUserPreferences["theme"] }));
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

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Language
          </label>
          <Select
            value={form.language}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({ ...prev, language: value }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="hi">Hindi</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Timezone
          </label>
          <Input
            value={form.timezone}
            onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Date Format
          </label>
          <Select
            value={form.dateFormat}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({ ...prev, dateFormat: value }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dd MMM yyyy">dd MMM yyyy</SelectItem>
              <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
              <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Time Format
          </label>
          <Select
            value={form.timeFormat}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({
                ...prev,
                timeFormat: value as CeoUserPreferences["timeFormat"],
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24-hour</SelectItem>
              <SelectItem value="12h">12-hour</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Default Dashboard
          </label>
          <Select
            value={form.defaultDashboard}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({ ...prev, defaultDashboard: value }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANDING_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Default Landing Page
          </label>
          <Select
            value={form.defaultLandingPage}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({ ...prev, defaultLandingPage: value }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANDING_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Sidebar State
          </label>
          <Select
            value={form.sidebarState}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({
                ...prev,
                sidebarState: value as CeoUserPreferences["sidebarState"],
              }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expanded">Expanded</SelectItem>
              <SelectItem value="collapsed">Collapsed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Notification Sound
          </label>
          <Select
            value={form.notificationSound}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({ ...prev, notificationSound: value }));
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NOTIFICATION_SOUND_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  );
}

export function CeoProfileNotificationSection({
  alertPreferences,
  onUpdated,
}: {
  alertPreferences: CeoAlertPreferences;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState(alertPreferences);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await saveCeoAlertPreferencesAction(form);
      if (result.success) {
        toast.success(result.message);
        onUpdated();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <section id="notifications" className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground">
            Configure executive alert categories and delivery channels.
          </p>
        </div>
        <Button type="button" size="sm" disabled={isPending} onClick={save}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save Notifications
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {ALERT_TOGGLES.map((item) => (
          <label
            key={item.key}
            className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
          >
            <span className="text-sm font-medium">{item.label}</span>
            <input
              type="checkbox"
              className="size-4"
              checked={form[item.key]}
              disabled={isPending}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, [item.key]: event.target.checked }))
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}
