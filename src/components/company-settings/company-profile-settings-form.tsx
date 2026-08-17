"use client";

import { Loader2, Trash2, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";

import { Input } from "@/components/common/input";
import { PhoneInput } from "@/components/common/phone-input";
import {
  SettingsField,
  SettingsFormActions,
  SettingsSectionCard,
} from "@/components/company-settings/settings-form-actions";
import {
  removeCompanyLogoAction,
  saveCompanyProfileAction,
  uploadCompanyLogoAction,
} from "@/lib/company-settings/actions";
import { DEFAULT_BRAND_LOGO_PATH } from "@/lib/brand/constants";
import { ORGANIZATION_LOGO_MAX_BYTES } from "@/lib/organization/constants";
import { organizationProfileSchema } from "@/lib/validations/organization";
import type { OrganizationProfile } from "@/types/organization";

type ProfileFormInput = z.input<typeof organizationProfileSchema>;
type ProfileFormValues = z.output<typeof organizationProfileSchema>;

function profileToFormValues(profile: OrganizationProfile): ProfileFormInput {
  const addressLine1 =
    profile.corporateAddressLine1 ?? profile.registeredAddressLine1 ?? "";
  const addressLine2 =
    profile.corporateAddressLine2 ?? profile.registeredAddressLine2 ?? "";
  const city = profile.corporateCity ?? profile.registeredCity ?? "";
  const state = profile.corporateState ?? profile.registeredState ?? "";
  const country = profile.corporateCountry ?? profile.registeredCountry ?? "IN";
  const postalCode =
    profile.corporatePostalCode ?? profile.registeredPostalCode ?? "";

  return {
    name: profile.name,
    legalName: profile.legalName ?? "",
    email: profile.email ?? "",
    phone: profile.phone ?? "",
    website: profile.website ?? "",
    gstNumber: profile.gstNumber ?? "",
    panNumber: profile.panNumber ?? "",
    cin: profile.cin ?? "",
    registeredAddressLine1: addressLine1,
    registeredAddressLine2: addressLine2,
    registeredCity: city,
    registeredState: state,
    registeredCountry: country,
    registeredPostalCode: postalCode,
    corporateAddressLine1: addressLine1,
    corporateAddressLine2: addressLine2,
    corporateCity: city,
    corporateState: state,
    corporateCountry: country,
    corporatePostalCode: postalCode,
    timezone: profile.timezone,
    currencyCode: profile.currencyCode,
    dateFormat: profile.dateFormat,
    fiscalYearStartMonth: profile.fiscalYearStartMonth,
  };
}

function withSyncedAddress(values: ProfileFormValues): ProfileFormValues {
  return {
    ...values,
    registeredAddressLine1: values.corporateAddressLine1,
    registeredAddressLine2: values.corporateAddressLine2,
    registeredCity: values.corporateCity,
    registeredState: values.corporateState,
    registeredCountry: values.corporateCountry,
    registeredPostalCode: values.corporatePostalCode,
  };
}

function CompanyLogoField({
  logoUrl,
  hasCustomLogo,
  companyName,
  canEdit,
}: {
  logoUrl: string | null;
  hasCustomLogo: boolean;
  companyName: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultLogoUrl = DEFAULT_BRAND_LOGO_PATH;
  const resolvedLogoUrl = logoUrl ?? defaultLogoUrl;
  const [previewUrl, setPreviewUrl] = useState(resolvedLogoUrl);
  const [isCustomLogo, setIsCustomLogo] = useState(hasCustomLogo);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPreviewUrl(logoUrl ?? defaultLogoUrl);
    setIsCustomLogo(hasCustomLogo);
  }, [logoUrl, hasCustomLogo, defaultLogoUrl]);

  const openPicker = () => {
    if (!canEdit || isPending) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      event.target.value = "";
      return;
    }

    if (file.size > ORGANIZATION_LOGO_MAX_BYTES) {
      toast.error("Company logo must be 10 MB or smaller");
      event.target.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadCompanyLogoAction(formData);
      if (!result.success) {
        toast.error(result.message);
        setPreviewUrl(resolvedLogoUrl);
        return;
      }

      setPreviewUrl(result.data?.logoUrl ?? preview);
      setIsCustomLogo(true);
      toast.success("Company logo updated");
      router.refresh();
    });

    event.target.value = "";
  };

  const handleRemove = () => {
    if (!canEdit || isPending) return;

    startTransition(async () => {
      const result = await removeCompanyLogoAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setPreviewUrl(defaultLogoUrl);
      setIsCustomLogo(false);
      toast.success("Custom logo removed — using default iFranchise logo");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={openPicker}
        disabled={!canEdit || isPending}
        className="group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40 ring-1 ring-border transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Upload company logo"
      >
        <Image
          src={previewUrl}
          alt={`${companyName} logo`}
          width={80}
          height={80}
          unoptimized={previewUrl.startsWith("http") || previewUrl.startsWith("blob:")}
          className="size-full object-contain p-1"
        />
        {canEdit ? (
          <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 transition group-hover:opacity-100">
            <Upload className="size-5" />
          </span>
        ) : null}
      </button>

      <div className="space-y-2">
        <p className="text-sm font-medium">Company logo</p>
        <p className="text-sm text-muted-foreground">
          Shown in the sidebar, payslips, and employee documents across the portal.
        </p>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openPicker}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              <Upload className="size-4" />
              Upload logo
            </button>
            {isCustomLogo ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                <Trash2 className="size-4" />
                Remove custom logo
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {isPending ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground sm:ml-auto">
          <Loader2 className="size-4 animate-spin" />
          Updating logo…
        </div>
      ) : null}
    </div>
  );
}

export function CompanyProfileSettingsForm({
  profile,
  logoUrl,
  canEdit,
}: {
  profile: OrganizationProfile;
  logoUrl: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const baseline = profileToFormValues(profile);

  const form = useForm<ProfileFormInput, unknown, ProfileFormValues>({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: baseline,
  });

  function onSubmit(values: ProfileFormValues) {
    startTransition(async () => {
      const synced = withSyncedAddress(values);
      const res = await saveCompanyProfileAction({ ...baseline, ...synced });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      form.reset({ ...baseline, ...synced });
      toast.success("Company profile saved");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="mx-auto flex w-full max-w-3xl flex-col gap-6"
    >
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Company Settings</h1>
          <SettingsFormActions
            canEdit={canEdit}
            isDirty={form.formState.isDirty}
            isPending={isPending}
            onReset={() => form.reset(baseline)}
            placement="inline"
          />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Company logo, name, contact details, and office address used across the portal.
        </p>
        {!canEdit ? (
          <p className="mt-2 text-sm text-muted-foreground">
            You have view-only access. Only Super Admin can edit company settings.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
      <SettingsSectionCard
        title="Company profile"
        description="Core company details used across HR, payroll, payslips, and employee portals."
      >
        <CompanyLogoField
          logoUrl={logoUrl}
          hasCustomLogo={Boolean(profile.logoStoragePath)}
          companyName={form.watch("name") || profile.name}
          canEdit={canEdit}
        />

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <SettingsField label="Company name">
            <Input {...form.register("name")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Legal name">
            <Input {...form.register("legalName")} disabled={!canEdit || isPending} />
          </SettingsField>
          <SettingsField label="Official email">
            <Input
              type="email"
              {...form.register("email")}
              disabled={!canEdit || isPending}
              placeholder="hr@company.com"
            />
          </SettingsField>
          <SettingsField label="Phone">
            <PhoneInput
              value={form.watch("phone") ?? ""}
              onChange={(value) => form.setValue("phone", value, { shouldValidate: true })}
              disabled={!canEdit || isPending}
              error={form.formState.errors.phone?.message}
            />
          </SettingsField>
          <div className="sm:col-span-2">
            <SettingsField label="Website">
              <Input
                {...form.register("website")}
                disabled={!canEdit || isPending}
                placeholder="https://www.company.com"
              />
            </SettingsField>
          </div>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard title="Company address" description="Office address shown on payslips and letters.">
        <div className="space-y-4">
          <Input
            placeholder="Address line 1"
            {...form.register("corporateAddressLine1")}
            disabled={!canEdit || isPending}
          />
          <Input
            placeholder="Address line 2"
            {...form.register("corporateAddressLine2")}
            disabled={!canEdit || isPending}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              placeholder="City"
              {...form.register("corporateCity")}
              disabled={!canEdit || isPending}
            />
            <Input
              placeholder="State"
              {...form.register("corporateState")}
              disabled={!canEdit || isPending}
            />
            <Input
              placeholder="Country"
              {...form.register("corporateCountry")}
              disabled={!canEdit || isPending}
            />
            <Input
              placeholder="Postal code"
              {...form.register("corporatePostalCode")}
              disabled={!canEdit || isPending}
            />
          </div>
        </div>
      </SettingsSectionCard>
      </div>
    </form>
  );
}
