"use client";

import { Loader2, Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { PhoneInput } from "@/components/common/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { CompanyIdentityCard } from "@/components/organization/company-identity-card";
import { saveOrganizationProfileAction } from "@/lib/organization/actions";
import {
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  FISCAL_MONTH_OPTIONS,
  TIMEZONE_OPTIONS,
  organizationProfileSchema,
} from "@/lib/validations/organization";
import type { z } from "zod";
import type { OrganizationProfile } from "@/types/organization";

type ProfileFormInput = z.infer<typeof organizationProfileSchema>;

type Props = {
  profile: OrganizationProfile;
  logoUrl: string | null;
  canEdit: boolean;
};

const SELECT_CONTENT_CLASS = "min-w-[14rem] max-w-[20rem]";

function displayValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function formatAddress(
  line1: string,
  line2: string,
  city: string,
  state: string,
  postalCode: string,
  country: string,
) {
  const parts = [line1, line2, city, state, postalCode, country]
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

function profileToValues(profile: OrganizationProfile): ProfileFormInput {
  return {
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
  };
}

function ProfileFieldControl({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return <div className={wide ? "w-full max-w-md" : "w-full max-w-xs"}>{children}</div>;
}

function ProfileInfoRow({
  label,
  value,
  editing,
  children,
  valueClassName,
}: {
  label: string;
  value?: string;
  editing?: boolean;
  children?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b px-4 py-3 last:border-b-0 sm:gap-6">
      <dt className="w-32 shrink-0 pt-0.5 text-sm text-muted-foreground sm:w-40">{label}</dt>
      <dd className={`min-w-0 flex-1 text-right text-sm font-medium ${valueClassName ?? ""}`}>
        {editing && children ? <div className="flex justify-end">{children}</div> : value ?? "—"}
      </dd>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      <dl className="rounded-xl border bg-card">{children}</dl>
    </section>
  );
}

export function OrganizationProfileForm({ profile, logoUrl, canEdit }: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(organizationProfileSchema),
    defaultValues: profileToValues(profile),
  });

  const values = form.watch();
  const fiscalLabel =
    FISCAL_MONTH_OPTIONS.find((month) => month.value === values.fiscalYearStartMonth)?.label ??
    "—";

  function onSubmit(formValues: ProfileFormInput) {
    startTransition(async () => {
      const res = await saveOrganizationProfileAction(formValues);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Company profile updated");
      form.reset(formValues);
      setIsEditing(false);
      router.refresh();
    });
  }

  function onCancel() {
    form.reset(profileToValues(profile));
    setIsEditing(false);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Company Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isEditing
              ? "Update company information, addresses, and regional settings."
              : "View company information, addresses, and regional settings."}
          </p>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={onCancel}>
                  <X className="size-4" />
                  Cancel
                </Button>
                <Button type="button" size="sm" disabled={isPending} onClick={form.handleSubmit(onSubmit)}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save
                </Button>
              </>
            ) : (
              <Button type="button" size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid items-start gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,26rem)]"
      >
        <div className="space-y-4 lg:col-start-1">
          <SectionCard title="Company Information">
            <ProfileInfoRow label="Company name" value={displayValue(values.name)} editing={isEditing}>
              <ProfileFieldControl>
                <Input className="h-8 w-full text-right" disabled={isPending} {...form.register("name")} />
              </ProfileFieldControl>
            </ProfileInfoRow>
            <ProfileInfoRow label="Legal name" value={displayValue(values.legalName)} editing={isEditing}>
              <ProfileFieldControl>
                <Input className="h-8 w-full text-right" disabled={isPending} {...form.register("legalName")} />
              </ProfileFieldControl>
            </ProfileInfoRow>
            <ProfileInfoRow label="Email" value={displayValue(values.email)} editing={isEditing}>
              <ProfileFieldControl>
                <Input type="email" className="h-8 w-full text-right" disabled={isPending} {...form.register("email")} />
              </ProfileFieldControl>
            </ProfileInfoRow>
            <ProfileInfoRow label="Phone" value={displayValue(values.phone)} editing={isEditing}>
              <ProfileFieldControl wide>
                <PhoneInput
                  size="sm"
                  value={form.watch("phone") ?? ""}
                  onChange={(value) => form.setValue("phone", value, { shouldValidate: true })}
                  disabled={isPending}
                  error={form.formState.errors.phone?.message}
                  className="w-full"
                />
              </ProfileFieldControl>
            </ProfileInfoRow>
            <ProfileInfoRow label="Website" value={displayValue(values.website)} editing={isEditing}>
              <ProfileFieldControl wide>
                <Input className="h-8 w-full text-right" disabled={isPending} {...form.register("website")} />
              </ProfileFieldControl>
            </ProfileInfoRow>
          </SectionCard>

          <SectionCard title="Tax & Registration">
            <ProfileInfoRow label="GST number" value={displayValue(values.gstNumber)} editing={isEditing}>
              <ProfileFieldControl>
                <Input className="h-8 w-full text-right" disabled={isPending} {...form.register("gstNumber")} />
              </ProfileFieldControl>
            </ProfileInfoRow>
            <ProfileInfoRow label="PAN" value={displayValue(values.panNumber)} editing={isEditing}>
              <ProfileFieldControl>
                <Input className="h-8 w-full text-right" disabled={isPending} {...form.register("panNumber")} />
              </ProfileFieldControl>
            </ProfileInfoRow>
            <ProfileInfoRow label="CIN" value={displayValue(values.cin)} editing={isEditing}>
              <ProfileFieldControl>
                <Input className="h-8 w-full text-right" disabled={isPending} {...form.register("cin")} />
              </ProfileFieldControl>
            </ProfileInfoRow>
          </SectionCard>

          <SectionCard title="Registered Address">
            <ProfileInfoRow
              label="Address"
              value={formatAddress(
                values.registeredAddressLine1 ?? "",
                values.registeredAddressLine2 ?? "",
                values.registeredCity ?? "",
                values.registeredState ?? "",
                values.registeredPostalCode ?? "",
                values.registeredCountry ?? "",
              )}
              valueClassName="leading-snug whitespace-normal"
              editing={isEditing}
            >
              <ProfileFieldControl wide>
                <div className="space-y-2">
                  <Input placeholder="Address line 1" className="h-8 w-full text-right" disabled={isPending} {...form.register("registeredAddressLine1")} />
                  <Input placeholder="Address line 2" className="h-8 w-full text-right" disabled={isPending} {...form.register("registeredAddressLine2")} />
                  <Input placeholder="City" className="h-8 w-full text-right" disabled={isPending} {...form.register("registeredCity")} />
                  <Input placeholder="State" className="h-8 w-full text-right" disabled={isPending} {...form.register("registeredState")} />
                  <Input placeholder="Country" className="h-8 w-full text-right" disabled={isPending} {...form.register("registeredCountry")} />
                  <Input placeholder="Postal code" className="h-8 w-full text-right" disabled={isPending} {...form.register("registeredPostalCode")} />
                </div>
              </ProfileFieldControl>
            </ProfileInfoRow>
          </SectionCard>

          <SectionCard title="Corporate Address">
            <ProfileInfoRow
              label="Address"
              value={formatAddress(
                values.corporateAddressLine1 ?? "",
                values.corporateAddressLine2 ?? "",
                values.corporateCity ?? "",
                values.corporateState ?? "",
                values.corporatePostalCode ?? "",
                values.corporateCountry ?? "",
              )}
              valueClassName="leading-snug whitespace-normal"
              editing={isEditing}
            >
              <ProfileFieldControl wide>
                <div className="space-y-2">
                  <Input placeholder="Address line 1" className="h-8 w-full text-right" disabled={isPending} {...form.register("corporateAddressLine1")} />
                  <Input placeholder="Address line 2" className="h-8 w-full text-right" disabled={isPending} {...form.register("corporateAddressLine2")} />
                  <Input placeholder="City" className="h-8 w-full text-right" disabled={isPending} {...form.register("corporateCity")} />
                  <Input placeholder="State" className="h-8 w-full text-right" disabled={isPending} {...form.register("corporateState")} />
                  <Input placeholder="Country" className="h-8 w-full text-right" disabled={isPending} {...form.register("corporateCountry")} />
                  <Input placeholder="Postal code" className="h-8 w-full text-right" disabled={isPending} {...form.register("corporatePostalCode")} />
                </div>
              </ProfileFieldControl>
            </ProfileInfoRow>
          </SectionCard>

          <SectionCard title="Regional Settings">
            <ProfileInfoRow label="Time zone" value={displayValue(values.timezone)} editing={isEditing}>
              <ProfileFieldControl>
                <Select
                  value={values.timezone}
                  onValueChange={(value) => value && form.setValue("timezone", value)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" alignItemWithTrigger={false} className={SELECT_CONTENT_CLASS}>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>
                        {tz}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ProfileFieldControl>
            </ProfileInfoRow>
            <ProfileInfoRow label="Currency" value={displayValue(values.currencyCode)} editing={isEditing}>
              <ProfileFieldControl>
                <Select
                  value={values.currencyCode}
                  onValueChange={(value) => value && form.setValue("currencyCode", value)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" alignItemWithTrigger={false} className={SELECT_CONTENT_CLASS}>
                    {CURRENCY_OPTIONS.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ProfileFieldControl>
            </ProfileInfoRow>
            <ProfileInfoRow label="Date format" value={displayValue(values.dateFormat)} editing={isEditing}>
              <ProfileFieldControl>
                <Select
                  value={values.dateFormat}
                  onValueChange={(value) => value && form.setValue("dateFormat", value)}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" alignItemWithTrigger={false} className={SELECT_CONTENT_CLASS}>
                    {DATE_FORMAT_OPTIONS.map((format) => (
                      <SelectItem key={format} value={format}>
                        {format}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ProfileFieldControl>
            </ProfileInfoRow>
            <ProfileInfoRow label="Financial year" value={fiscalLabel} editing={isEditing}>
              <ProfileFieldControl>
                <Select
                  value={String(values.fiscalYearStartMonth)}
                  onValueChange={(value) => value && form.setValue("fiscalYearStartMonth", Number(value))}
                  disabled={isPending}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end" alignItemWithTrigger={false} className={SELECT_CONTENT_CLASS}>
                    {FISCAL_MONTH_OPTIONS.map((month) => (
                      <SelectItem key={month.value} value={String(month.value)}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ProfileFieldControl>
            </ProfileInfoRow>
          </SectionCard>
        </div>

        <aside className="flex flex-col items-center self-start overflow-visible lg:sticky lg:top-4">
          <CompanyIdentityCard
            companyName={values.name || profile.name}
            legalName={values.legalName || profile.legalName}
            logoUrl={logoUrl}
            hasCustomLogo={Boolean(profile.logoStoragePath)}
            canEdit={canEdit}
          />
        </aside>
      </form>
    </div>
  );
}
