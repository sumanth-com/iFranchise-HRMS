"use client";

import { KeyRound, Loader2, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { employeeChangePasswordAction } from "@/lib/employee/actions/employee-settings-actions";
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

function AccountSection({ email }: { email: string }) {
  const [showForm, setShowForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, startTransition] = useTransition();

  function changePassword() {
    startTransition(async () => {
      const result = await employeeChangePasswordAction({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (result.success) {
        toast.success(result.message);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowForm(false);
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Account & security</h2>
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => setShowForm((value) => !value)}
        >
          <KeyRound className="size-3.5" />
          Reset password
        </Button>
      </div>

      {showForm ? (
        <div className="grid max-w-xl gap-3 sm:grid-cols-2">
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Current password"
            className="sm:col-span-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            disabled={isPending}
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            disabled={isPending}
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Use at least 12 characters with an uppercase letter, a number, and a special character.
          </p>
          <Button
            type="button"
            size="sm"
            className="sm:col-span-2"
            disabled={isPending || !currentPassword || !newPassword || !confirmPassword}
            onClick={changePassword}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Update password
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Keep your account secure by using a strong, unique password.
        </p>
      )}
    </section>
  );
}

export function EmployeeSettingsView({ email }: { email: string }) {
  return (
    <>
      <AppearanceSection />
      <AccountSection email={email} />
    </>
  );
}
