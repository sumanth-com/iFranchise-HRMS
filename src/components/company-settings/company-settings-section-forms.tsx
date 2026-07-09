"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { withSelectOption } from "@/components/payroll/select-utils";
import {
  SettingsField,
  SettingsFormActions,
  SettingsSectionCard,
  SettingsToggle,
} from "@/components/company-settings/settings-form-actions";
import {
  saveBackupConfigurationAction,
  saveBrandingConfigurationAction,
  saveIntegrationsConfigurationAction,
  saveLeavePoliciesAction,
  saveNotificationsGlobalAction,
  saveSecurityConfigurationAction,
  saveWorkingConfigurationAction,
} from "@/lib/company-settings/actions";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import {
  backupConfigurationSchema,
  brandingConfigurationSchema,
  integrationsConfigurationSchema,
  leavePoliciesSchema,
  notificationsGlobalSchema,
  securityConfigurationSchema,
  workingConfigurationSchema,
  type BackupConfigurationInput,
  type BackupConfigurationValues,
  type BrandingConfigurationInput,
  type BrandingConfigurationValues,
  type IntegrationsConfigurationInput,
  type IntegrationsConfigurationValues,
  type LeavePoliciesInput,
  type LeavePoliciesValues,
  type NotificationsGlobalInput,
  type NotificationsGlobalValues,
  type SecurityConfigurationInput,
  type SecurityConfigurationValues,
  type WorkingConfigurationInput,
  type WorkingConfigurationValues,
} from "@/lib/validations/company-settings";
import { FISCAL_MONTH_OPTIONS, TIMEZONE_OPTIONS } from "@/lib/validations/organization";
import type {
  BackupConfiguration,
  BrandingConfiguration,
  IntegrationsConfiguration,
  LeavePoliciesConfiguration,
  NotificationsGlobalConfiguration,
  SecurityConfiguration,
  WorkingConfiguration,
  WorkingDay,
} from "@/types/company-settings";

const WORKING_DAYS: { value: WorkingDay; label: string }[] = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

const WEEKEND_RULES = [
  { value: "off", label: "Off" },
  { value: "working", label: "Working day" },
  { value: "half_day", label: "Half day" },
];

function useSettingsFormSubmit<TValues>(
  onSave: (values: TValues) => Promise<{ success: boolean; message?: string }>,
  form: { reset: (values: TValues) => void; formState: { isDirty: boolean } },
  successMessage: string,
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSubmit(values: TValues) {
    startTransition(async () => {
      const res = await onSave(values);
      if (!res.success) {
        toast.error(res.message ?? "Save failed");
        return;
      }
      form.reset(values);
      toast.success(successMessage);
      router.refresh();
    });
  }

  return { isPending, onSubmit };
}

export function WorkingConfigurationForm({
  working,
  shiftTemplates,
  canEdit,
}: {
  working: WorkingConfiguration;
  shiftTemplates: { id: string; label: string }[];
  canEdit: boolean;
}) {
  const form = useForm<WorkingConfigurationInput, unknown, WorkingConfigurationValues>({
    resolver: zodResolver(workingConfigurationSchema),
    defaultValues: working,
  });
  const { isPending, onSubmit } = useSettingsFormSubmit(
    saveWorkingConfigurationAction,
    form,
    "Working configuration saved",
  );

  const shiftTemplateItems = useMemo(
    () =>
      withSelectOption(
        shiftTemplates.map((s) => ({ value: s.id, label: s.label })),
        { value: "none", label: "None" },
      ),
    [shiftTemplates],
  );

  const selectedDays = form.watch("officeWorkingDays");

  function toggleDay(day: WorkingDay) {
    const current = form.getValues("officeWorkingDays");
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    form.setValue("officeWorkingDays", next, { shouldDirty: true });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-1 flex-col gap-6">
      <SettingsSectionCard title="Office Working Days">
        <div className="flex flex-wrap gap-2">
          {WORKING_DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              disabled={!canEdit || isPending}
              onClick={() => toggleDay(day.value)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                selectedDays.includes(day.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "text-muted-foreground"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Office Hours & Breaks">
        <div className="grid gap-4 md:grid-cols-3">
          <SettingsField label="Start time">
            <Input {...form.register("officeHours.start")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="End time">
            <Input {...form.register("officeHours.end")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Timezone">
            <Select
              value={form.watch("officeHours.timezone")}
              onValueChange={(v) =>
                v && form.setValue("officeHours.timezone", v, { shouldDirty: true })
              }
              disabled={!canEdit || isPending}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Break start">
            <Input {...form.register("breakHours.start")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Break end">
            <Input {...form.register("breakHours.end")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Grace check-in">
            <Input {...form.register("graceTime.checkIn")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Weekend Rules"
        description="Manage holidays in Organization → Holidays."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="Saturday">
            <Select
              value={form.watch("weekendRules.saturday")}
              onValueChange={(v) =>
                v && form.setValue("weekendRules.saturday", v as "off" | "working" | "half_day", {
                  shouldDirty: true,
                })
              }
              disabled={!canEdit || isPending}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEEKEND_RULES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Sunday">
            <Select
              value={form.watch("weekendRules.sunday")}
              onValueChange={(v) =>
                v && form.setValue("weekendRules.sunday", v as "off" | "working" | "half_day", {
                  shouldDirty: true,
                })
              }
              disabled={!canEdit || isPending}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEEKEND_RULES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          <Link href={ORGANIZATION_ROUTES.holidays} className="text-primary underline">
            Open holiday calendar
          </Link>
        </p>
      </SettingsSectionCard>

      <SettingsSectionCard title="Shift Defaults">
        <SettingsField label="Default shift template">
          <LabeledSelect
            items={shiftTemplateItems}
            value={form.watch("defaultShiftTemplateId") ?? "none"}
            onValueChange={(v) =>
              form.setValue("defaultShiftTemplateId", v === "none" ? null : v, {
                shouldDirty: true,
              })
            }
            placeholder="Select shift"
            disabled={!canEdit || isPending}
          />
        </SettingsField>
      </SettingsSectionCard>

      <SettingsFormActions
        canEdit={canEdit}
        isDirty={form.formState.isDirty}
        isPending={isPending}
        onReset={() => form.reset(working)}
      />
    </form>
  );
}

export function LeavePoliciesForm({
  leave,
  canEdit,
}: {
  leave: LeavePoliciesConfiguration;
  canEdit: boolean;
}) {
  const form = useForm<LeavePoliciesInput, unknown, LeavePoliciesValues>({
    resolver: zodResolver(leavePoliciesSchema),
    defaultValues: leave,
  });
  const { isPending, onSubmit } = useSettingsFormSubmit(
    saveLeavePoliciesAction,
    form,
    "Leave policies saved",
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-1 flex-col gap-6">
      <SettingsSectionCard title="Leave Year & Approvals">
        <div className="grid gap-4 md:grid-cols-3">
          <SettingsField label="Leave year start month">
            <Select
              value={String(form.watch("leaveYearStartMonth"))}
              onValueChange={(v) =>
                v && form.setValue("leaveYearStartMonth", Number(v), { shouldDirty: true })
              }
              disabled={!canEdit || isPending}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FISCAL_MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Min notice days">
            <Input type="number" {...form.register("minNoticeDays")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Max consecutive days">
            <Input type="number" {...form.register("maxConsecutiveDays")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Approval levels">
            <Input type="number" min={1} max={5} {...form.register("approvalLevels")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SettingsToggle label="Allow half day" disabled={!canEdit || isPending} {...form.register("allowHalfDay")} />
          <SettingsToggle label="Allow carry forward" disabled={!canEdit || isPending} {...form.register("allowCarryForward")} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Half Day Rules">
        <SettingsToggle label="Enable half day rules" disabled={!canEdit || isPending} {...form.register("halfDayRules.enabled")} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SettingsField label="Morning session ends">
            <Input {...form.register("halfDayRules.morningEnd")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Afternoon session starts">
            <Input {...form.register("halfDayRules.afternoonStart")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Sandwich Leave">
        <SettingsToggle label="Enable sandwich leave policy" disabled={!canEdit || isPending} {...form.register("sandwichLeave.enabled")} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SettingsToggle label="Include weekends" disabled={!canEdit || isPending} {...form.register("sandwichLeave.includeWeekends")} />
          <SettingsToggle label="Include holidays" disabled={!canEdit || isPending} {...form.register("sandwichLeave.includeHolidays")} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Carry Forward & Encashment">
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsToggle label="Enable carry forward" disabled={!canEdit || isPending} {...form.register("carryForward.enabled")} />
          <SettingsToggle label="Enable encashment" disabled={!canEdit || isPending} {...form.register("encashment.enabled")} />
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <SettingsField label="Max carry forward days">
            <Input type="number" {...form.register("carryForward.maxDays")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Carry forward expiry (months)">
            <Input type="number" {...form.register("carryForward.expiryMonths")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Max encashment days/year">
            <Input type="number" {...form.register("encashment.maxDaysPerYear")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Min balance for encashment">
            <Input type="number" {...form.register("encashment.minBalanceRequired")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Default leave types are managed under Leave → Leave Types.
        </p>
      </SettingsSectionCard>

      <SettingsFormActions
        canEdit={canEdit}
        isDirty={form.formState.isDirty}
        isPending={isPending}
        onReset={() => form.reset(leave)}
      />
    </form>
  );
}

export function NotificationsGlobalForm({
  notifications,
  canEdit,
}: {
  notifications: NotificationsGlobalConfiguration;
  canEdit: boolean;
}) {
  const form = useForm<NotificationsGlobalInput, unknown, NotificationsGlobalValues>({
    resolver: zodResolver(notificationsGlobalSchema),
    defaultValues: notifications,
  });
  const { isPending, onSubmit } = useSettingsFormSubmit(
    saveNotificationsGlobalAction,
    form,
    "Notification configuration saved",
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-1 flex-col gap-6">
      <SettingsSectionCard title="Delivery Channels">
        <div className="grid gap-3 sm:grid-cols-2">
          <SettingsToggle label="Email notifications" disabled={!canEdit || isPending} {...form.register("emailEnabled")} />
          <SettingsToggle label="In-app notifications" disabled={!canEdit || isPending} {...form.register("inAppEnabled")} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Reminders & Digest">
        <div className="grid gap-4 md:grid-cols-2">
          <SettingsField label="Reminder frequency (hours)">
            <Input type="number" {...form.register("reminderFrequencyHours")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Digest frequency">
            <Select
              value={form.watch("digestFrequency")}
              onValueChange={(v) =>
                v && form.setValue("digestFrequency", v as "daily" | "weekly", { shouldDirty: true })
              }
              disabled={!canEdit || isPending}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </SettingsField>
        </div>
        <div className="mt-3">
          <SettingsToggle label="Enable digest emails" disabled={!canEdit || isPending} {...form.register("digestEnabled")} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Per-module notification channels are configured under Administration → Notifications → Settings.
        </p>
      </SettingsSectionCard>

      <SettingsFormActions
        canEdit={canEdit}
        isDirty={form.formState.isDirty}
        isPending={isPending}
        onReset={() => form.reset(notifications)}
      />
    </form>
  );
}

export function SecurityConfigurationForm({
  security,
  canEdit,
}: {
  security: SecurityConfiguration;
  canEdit: boolean;
}) {
  const form = useForm<SecurityConfigurationInput, unknown, SecurityConfigurationValues>({
    resolver: zodResolver(securityConfigurationSchema),
    defaultValues: security,
  });
  const { isPending, onSubmit } = useSettingsFormSubmit(
    saveSecurityConfigurationAction,
    form,
    "Security settings saved",
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-1 flex-col gap-6">
      <SettingsSectionCard title="Password Policy">
        <div className="grid gap-4 md:grid-cols-3">
          <SettingsField label="Minimum length">
            <Input type="number" {...form.register("passwordPolicy.minLength")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Password expiry (days, 0 = never)">
            <Input type="number" {...form.register("passwordPolicy.expiryDays")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SettingsToggle label="Require uppercase" disabled={!canEdit || isPending} {...form.register("passwordPolicy.requireUppercase")} />
          <SettingsToggle label="Require lowercase" disabled={!canEdit || isPending} {...form.register("passwordPolicy.requireLowercase")} />
          <SettingsToggle label="Require number" disabled={!canEdit || isPending} {...form.register("passwordPolicy.requireNumber")} />
          <SettingsToggle label="Require special character" disabled={!canEdit || isPending} {...form.register("passwordPolicy.requireSpecial")} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Session & Login">
        <div className="grid gap-4 md:grid-cols-3">
          <SettingsField label="Session timeout (minutes)">
            <Input type="number" {...form.register("sessionTimeoutMinutes")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Max login attempts">
            <Input type="number" {...form.register("maxLoginAttempts")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Account lock duration (minutes)">
            <Input type="number" {...form.register("lockDurationMinutes")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Multi-factor Authentication" description="Future-ready configuration.">
        <SettingsToggle
          label="Enable MFA (when available)"
          disabled={!canEdit || isPending}
          {...form.register("mfaEnabled")}
        />
      </SettingsSectionCard>

      <SettingsFormActions
        canEdit={canEdit}
        isDirty={form.formState.isDirty}
        isPending={isPending}
        onReset={() => form.reset(security)}
      />
    </form>
  );
}

export function BrandingConfigurationForm({
  branding,
  logoPath,
  canEdit,
}: {
  branding: BrandingConfiguration;
  logoPath: string | null;
  canEdit: boolean;
}) {
  const form = useForm<BrandingConfigurationInput, unknown, BrandingConfigurationValues>({
    resolver: zodResolver(brandingConfigurationSchema),
    defaultValues: branding,
  });
  const { isPending, onSubmit } = useSettingsFormSubmit(
    saveBrandingConfigurationAction,
    form,
    "Branding settings saved",
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-1 flex-col gap-6">
      <SettingsSectionCard title="Brand Colors">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="Primary color">
            <Input type="color" {...form.register("primaryColor")} disabled={!canEdit || isPending} className="h-10" />
          </SettingsField>
          <SettingsField label="Secondary color">
            <Input type="color" {...form.register("secondaryColor")} disabled={!canEdit || isPending} className="h-10" />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Logo & Favicon">
        <SettingsField label="Company logo path">
          <Input value={logoPath ?? ""} disabled placeholder="Set via organization profile" />
        </SettingsField>
        <div className="mt-4">
          <SettingsField label="Favicon path">
            <Input {...form.register("faviconPath")} disabled={!canEdit || isPending} placeholder="storage/path/favicon.ico" />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Login Screen & Footer">
        <div className="space-y-4">
          <SettingsField label="Login title">
            <Input {...form.register("loginTitle")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Login subtitle">
            <Input {...form.register("loginSubtitle")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Footer text">
            <Input {...form.register("footerText")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <SettingsFormActions
        canEdit={canEdit}
        isDirty={form.formState.isDirty}
        isPending={isPending}
        onReset={() => form.reset(branding)}
      />
    </form>
  );
}

export function IntegrationsConfigurationForm({
  integrations,
  canEdit,
}: {
  integrations: IntegrationsConfiguration;
  canEdit: boolean;
}) {
  const form = useForm<IntegrationsConfigurationInput, unknown, IntegrationsConfigurationValues>({
    resolver: zodResolver(integrationsConfigurationSchema),
    defaultValues: integrations,
  });
  const { isPending, onSubmit } = useSettingsFormSubmit(
    saveIntegrationsConfigurationAction,
    form,
    "Integrations saved",
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-1 flex-col gap-6">
      <SettingsSectionCard title="SMTP">
        <SettingsToggle label="Enable SMTP" disabled={!canEdit || isPending} {...form.register("smtp.enabled")} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SettingsField label="Host">
            <Input {...form.register("smtp.host")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Port">
            <Input type="number" {...form.register("smtp.port")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Username">
            <Input {...form.register("smtp.username")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="From email">
            <Input {...form.register("smtp.fromEmail")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
        <div className="mt-3">
          <SettingsToggle label="Use TLS" disabled={!canEdit || isPending} {...form.register("smtp.useTls")} />
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Calendars">
        <div className="space-y-4">
          <SettingsToggle label="Google Calendar" disabled={!canEdit || isPending} {...form.register("googleCalendar.enabled")} />
          <SettingsField label="Google client ID">
            <Input {...form.register("googleCalendar.clientId")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsToggle label="Microsoft Outlook" disabled={!canEdit || isPending} {...form.register("microsoftOutlook.enabled")} />
          <SettingsField label="Microsoft tenant ID">
            <Input {...form.register("microsoftOutlook.tenantId")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Storage & Webhooks">
        <SettingsField label="Storage provider">
          <Select
            value={form.watch("storageProvider")}
            onValueChange={(v) =>
              v && form.setValue("storageProvider", v as "supabase" | "s3" | "azure", {
                shouldDirty: true,
              })
            }
            disabled={!canEdit || isPending}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="supabase">Supabase</SelectItem>
              <SelectItem value="s3">Amazon S3</SelectItem>
              <SelectItem value="azure">Azure Blob</SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SettingsField label="Webhook URL">
            <Input {...form.register("webhookUrl")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Webhook secret">
            <Input type="password" {...form.register("webhookSecret")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
        <div className="mt-3">
          <SettingsToggle label="API keys (future ready)" disabled={!canEdit || isPending} {...form.register("apiKeysEnabled")} />
        </div>
      </SettingsSectionCard>

      <SettingsFormActions
        canEdit={canEdit}
        isDirty={form.formState.isDirty}
        isPending={isPending}
        onReset={() => form.reset(integrations)}
      />
    </form>
  );
}

export function BackupConfigurationForm({
  backup,
  canEdit,
}: {
  backup: BackupConfiguration;
  canEdit: boolean;
}) {
  const form = useForm<BackupConfigurationInput, unknown, BackupConfigurationValues>({
    resolver: zodResolver(backupConfigurationSchema),
    defaultValues: backup,
  });
  const { isPending, onSubmit } = useSettingsFormSubmit(
    saveBackupConfigurationAction,
    form,
    "Backup & maintenance settings saved",
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-1 flex-col gap-6">
      <SettingsSectionCard title="Backup">
        <SettingsField label="Backup frequency">
          <Select
            value={form.watch("backupFrequency")}
            onValueChange={(v) =>
              v && form.setValue("backupFrequency", v as "hourly" | "daily" | "weekly", {
                shouldDirty: true,
              })
            }
            disabled={!canEdit || isPending}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </SettingsField>
      </SettingsSectionCard>

      <SettingsSectionCard title="System Maintenance">
        <SettingsToggle label="Maintenance mode" disabled={!canEdit || isPending} {...form.register("maintenanceMode")} />
        <div className="mt-4">
          <SettingsField label="Maintenance message">
            <Input {...form.register("maintenanceMessage")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Log Retention" description="Also syncs with audit log retention settings.">
        <SettingsField label="Log retention (days)">
          <Input type="number" {...form.register("logRetentionDays")} disabled={!canEdit || isPending} />
        </SettingsField>
      </SettingsSectionCard>

      <SettingsFormActions
        canEdit={canEdit}
        isDirty={form.formState.isDirty}
        isPending={isPending}
        onReset={() => form.reset(backup)}
      />
    </form>
  );
}
