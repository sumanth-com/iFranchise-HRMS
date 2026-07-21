"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { AccountPasswordResetSection } from "@/components/auth/account-password-reset-section";
import { EmployeeProfileSettingsSection } from "@/components/employee/settings/employee-profile-settings-section";
import type { EmployeeSelfProfileSettings } from "@/lib/employee/services/employee-self-profile";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  { value: "system", label: "System", description: "Match your device", icon: Monitor },
  { value: "light", label: "Light", description: "Bright and clean", icon: Sun },
  { value: "dark", label: "Dark", description: "Easy on the eyes", icon: Moon },
] as const;

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const active = mounted ? theme ?? "system" : "system";

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">Appearance</h2>
        <p className="text-xs text-muted-foreground">
          Choose how the portal looks. Changes apply instantly.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = active === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                  : "hover:bg-accent/40",
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-md border",
                  selected ? "border-primary/40 bg-primary/10 text-primary" : "bg-muted/40",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function EmployeeSettingsView({
  email,
  profileSettings,
  profileImageUrl,
}: {
  email: string;
  profileSettings?: EmployeeSelfProfileSettings | null;
  profileImageUrl?: string | null;
}) {
  return (
    <>
      {profileSettings ? (
        <EmployeeProfileSettingsSection
          settings={profileSettings}
          profileImageUrl={profileImageUrl ?? null}
        />
      ) : null}
      <AppearanceSection />
      <AccountPasswordResetSection email={email} />
    </>
  );
}
