"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select";
import { Label } from "@/components/ui/label";
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
  canEdit: boolean;
};

export function OrganizationProfileForm({ profile, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm({
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

  function onSubmit(values: ProfileFormInput) {
    startTransition(async () => {
      const res = await saveOrganizationProfileAction(values);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success("Company profile updated");
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Company Information</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input {...form.register("name")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Legal Name</Label>
            <Input {...form.register("legalName")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...form.register("email")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input {...form.register("phone")} disabled={!canEdit} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Website</Label>
            <Input {...form.register("website")} disabled={!canEdit} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Tax & Registration</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>GST Number</Label>
            <Input {...form.register("gstNumber")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>PAN</Label>
            <Input {...form.register("panNumber")} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>CIN</Label>
            <Input {...form.register("cin")} disabled={!canEdit} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Registered Address</h2>
          <div className="mt-4 space-y-4">
            <Input placeholder="Address line 1" {...form.register("registeredAddressLine1")} disabled={!canEdit} />
            <Input placeholder="Address line 2" {...form.register("registeredAddressLine2")} disabled={!canEdit} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="City" {...form.register("registeredCity")} disabled={!canEdit} />
              <Input placeholder="State" {...form.register("registeredState")} disabled={!canEdit} />
              <Input placeholder="Country" {...form.register("registeredCountry")} disabled={!canEdit} />
              <Input placeholder="Postal code" {...form.register("registeredPostalCode")} disabled={!canEdit} />
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Corporate Address</h2>
          <div className="mt-4 space-y-4">
            <Input placeholder="Address line 1" {...form.register("corporateAddressLine1")} disabled={!canEdit} />
            <Input placeholder="Address line 2" {...form.register("corporateAddressLine2")} disabled={!canEdit} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input placeholder="City" {...form.register("corporateCity")} disabled={!canEdit} />
              <Input placeholder="State" {...form.register("corporateState")} disabled={!canEdit} />
              <Input placeholder="Country" {...form.register("corporateCountry")} disabled={!canEdit} />
              <Input placeholder="Postal code" {...form.register("corporatePostalCode")} disabled={!canEdit} />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Regional Settings</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Time Zone</Label>
            <Select
              value={form.watch("timezone")}
              onValueChange={(v) => v && form.setValue("timezone", v)}
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={form.watch("currencyCode")}
              onValueChange={(v) => v && form.setValue("currencyCode", v)}
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date Format</Label>
            <Select
              value={form.watch("dateFormat")}
              onValueChange={(v) => v && form.setValue("dateFormat", v)}
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DATE_FORMAT_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Financial Year Start</Label>
            <Select
              value={String(form.watch("fiscalYearStartMonth"))}
              onValueChange={(v) => v && form.setValue("fiscalYearStartMonth", Number(v))}
              disabled={!canEdit}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FISCAL_MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Profile
          </Button>
        </div>
      ) : null}
    </form>
  );
}
