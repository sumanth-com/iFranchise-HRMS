"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Input } from "@/components/common/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import {
  SettingsField,
  SettingsFormActions,
  SettingsSectionCard,
} from "@/components/company-settings/settings-form-actions";
import { saveCompanyProfileAction } from "@/lib/company-settings/actions";
import {
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  FISCAL_MONTH_OPTIONS,
  TIMEZONE_OPTIONS,
  organizationProfileSchema,
} from "@/lib/validations/organization";
import type { OrganizationProfile } from "@/types/organization";

type ProfileFormInput = z.input<typeof organizationProfileSchema>;
type ProfileFormValues = z.output<typeof organizationProfileSchema>;

export function CompanyProfileSettingsForm({
  profile,
  canEdit,
}: {
  profile: OrganizationProfile;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: {
      name: profile.name,
      legalName: profile.legalName ?? "",
      email: profile.email ?? "",
      phone: profile.phone ?? "",
      website: profile.website ?? "",
      gstNumber: profile.gstNumber ?? "",
      panNumber: profile.panNumber ?? "",
      cin: profile.cin ?? "",
      registeredAddressLine1: profile.registeredAddressLine1 ?? "",
      registeredAddressLine2: profile.registeredAddressLine2 ?? "",
      registeredCity: profile.registeredCity ?? "",
      registeredState: profile.registeredState ?? "",
      registeredCountry: profile.registeredCountry ?? "IN",
      registeredPostalCode: profile.registeredPostalCode ?? "",
      corporateAddressLine1: profile.corporateAddressLine1 ?? "",
      corporateAddressLine2: profile.corporateAddressLine2 ?? "",
      corporateCity: profile.corporateCity ?? "",
      corporateState: profile.corporateState ?? "",
      corporateCountry: profile.corporateCountry ?? "IN",
      corporatePostalCode: profile.corporatePostalCode ?? "",
      timezone: profile.timezone,
      currencyCode: profile.currencyCode,
      dateFormat: profile.dateFormat,
      fiscalYearStartMonth: profile.fiscalYearStartMonth,
    },
  });

  function onSubmit(values: ProfileFormValues) {
    startTransition(async () => {
      const res = await saveCompanyProfileAction(values);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      form.reset(values);
      toast.success("Company profile saved");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex min-h-full flex-1 flex-col gap-4"
    >
      <SettingsSectionCard title="Company Information">
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsField label="Company Name">
            <Input {...form.register("name")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Legal Name">
            <Input {...form.register("legalName")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Email">
            <Input type="email" {...form.register("email")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Phone">
            <Input {...form.register("phone")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Website">
            <Input {...form.register("website")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Logo path">
            <Input
              value={profile.logoStoragePath ?? ""}
              disabled
              placeholder="Managed via branding section"
            />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Tax & Registration">
        <div className="grid gap-4 sm:grid-cols-3">
          <SettingsField label="GST Number">
            <Input {...form.register("gstNumber")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="PAN">
            <Input {...form.register("panNumber")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="CIN">
            <Input {...form.register("cin")} disabled={!canEdit || isPending} />
          </SettingsField>
        </div>
      </SettingsSectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SettingsSectionCard title="Registered Address">
          <div className="space-y-4">
            <Input placeholder="Address line 1" {...form.register("registeredAddressLine1")} disabled={!canEdit || isPending} />
            <Input placeholder="Address line 2" {...form.register("registeredAddressLine2")} disabled={!canEdit || isPending} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="City" {...form.register("registeredCity")} disabled={!canEdit || isPending} />
              <Input placeholder="State" {...form.register("registeredState")} disabled={!canEdit || isPending} />
              <Input placeholder="Country" {...form.register("registeredCountry")} disabled={!canEdit || isPending} />
              <Input placeholder="Postal code" {...form.register("registeredPostalCode")} disabled={!canEdit || isPending} />
            </div>
          </div>
        </SettingsSectionCard>
        <SettingsSectionCard title="Corporate Address">
          <div className="space-y-4">
            <Input placeholder="Address line 1" {...form.register("corporateAddressLine1")} disabled={!canEdit || isPending} />
            <Input placeholder="Address line 2" {...form.register("corporateAddressLine2")} disabled={!canEdit || isPending} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="City" {...form.register("corporateCity")} disabled={!canEdit || isPending} />
              <Input placeholder="State" {...form.register("corporateState")} disabled={!canEdit || isPending} />
              <Input placeholder="Country" {...form.register("corporateCountry")} disabled={!canEdit || isPending} />
              <Input placeholder="Postal code" {...form.register("corporatePostalCode")} disabled={!canEdit || isPending} />
            </div>
          </div>
        </SettingsSectionCard>
      </div>

      <SettingsSectionCard title="Regional Settings" description="Timezone, currency, date format, and financial year.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SettingsField label="Timezone">
            <Select
              value={form.watch("timezone")}
              onValueChange={(v) => v && form.setValue("timezone", v, { shouldDirty: true })}
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
          <SettingsField label="Currency">
            <Select
              value={form.watch("currencyCode")}
              onValueChange={(v) => v && form.setValue("currencyCode", v, { shouldDirty: true })}
              disabled={!canEdit || isPending}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Date Format">
            <Select
              value={form.watch("dateFormat")}
              onValueChange={(v) => v && form.setValue("dateFormat", v, { shouldDirty: true })}
              disabled={!canEdit || isPending}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsField>
          <SettingsField label="Financial Year Start">
            <Select
              value={String(form.watch("fiscalYearStartMonth"))}
              onValueChange={(v) =>
                v && form.setValue("fiscalYearStartMonth", Number(v), { shouldDirty: true })
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
        </div>
      </SettingsSectionCard>

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Saving…
        </div>
      ) : null}

      <SettingsFormActions
        canEdit={canEdit}
        isDirty={form.formState.isDirty}
        isPending={isPending}
        onReset={() => form.reset()}
      />
    </form>
  );
}
