"use client";

import { Camera, Loader2, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Label } from "@/components/ui/label";
import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/employees/constants";
import { updateEmployeeSelfProfileAction } from "@/lib/employees/actions";
import {
  removeProfileImageAction,
  uploadProfileImageAction,
} from "@/lib/employees/profile-image-actions";
import type { EmployeeSelfProfileSettings } from "@/lib/employee/services/employee-self-profile";
import { TIMEZONE_OPTIONS } from "@/lib/validations/organization";
import {
  employeeSelfPreferencesSchema,
  type EmployeeSelfPreferencesInput,
} from "@/lib/validations/employee";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
] as const;

function formatFullAddress(address: EmployeeSelfProfileSettings["address"]) {
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "—";
}

type EmployeeProfileSettingsSectionProps = {
  settings: EmployeeSelfProfileSettings;
  profileImageUrl: string | null;
};

export function EmployeeProfileSettingsSection({
  settings,
  profileImageUrl: initialImageUrl,
}: EmployeeProfileSettingsSectionProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [imageUrl, setImageUrl] = useState(initialImageUrl);

  useEffect(() => {
    setImageUrl(initialImageUrl);
  }, [initialImageUrl]);

  const { handleSubmit, setValue, watch } = useForm<EmployeeSelfPreferencesInput>({
    resolver: zodResolver(employeeSelfPreferencesSchema),
    defaultValues: {
      language: settings.language,
      timezone: settings.timezone,
    },
  });

  const language = watch("language");
  const timezone = watch("timezone");

  function onSubmit(data: EmployeeSelfPreferencesInput) {
    startTransition(async () => {
      const result = await updateEmployeeSelfProfileAction(data);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    });
  }

  function handlePhotoSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      toast.error("Profile image must be 10 MB or smaller");
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    startTransition(async () => {
      const result = await uploadProfileImageAction(settings.employeeId, formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Profile photo updated");
      router.refresh();
    });
  }

  function handleRemovePhoto() {
    startTransition(async () => {
      const result = await removeProfileImageAction(settings.employeeId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setImageUrl(null);
      toast.success("Profile photo removed");
      router.refresh();
    });
  }

  const initials = `${settings.firstName.charAt(0)}${settings.lastName.charAt(0)}`.toUpperCase();

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">Profile</h2>
        <p className="text-xs text-muted-foreground">
          Update language and timezone preferences. Contact, address, and emergency details are
          managed by HR.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-muted/40 text-lg font-semibold text-muted-foreground">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`${settings.firstName} ${settings.lastName}`}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            initials
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            Upload photo
          </Button>
          {imageUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={isPending}
              onClick={handleRemovePhoto}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Employment (read-only)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>First name</Label>
              <Input value={settings.firstName} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label>Last name</Label>
              <Input value={settings.lastName} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input value={settings.employeeCode} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label>Company email</Label>
              <Input value={settings.email} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Input value={settings.departmentName ?? "—"} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label>Designation</Label>
              <Input value={settings.designationTitle ?? "—"} disabled readOnly />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Contact & emergency (managed by HR)</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Personal email</Label>
              <Input value={settings.personalEmail || "—"} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label>Personal phone</Label>
              <Input value={settings.personalPhone || "—"} disabled readOnly />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Address</Label>
              <Input value={formatFullAddress(settings.address)} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label>Emergency name</Label>
              <Input value={settings.emergencyContact.name || "—"} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label>Relationship</Label>
              <Input
                value={settings.emergencyContact.relationship || "—"}
                disabled
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Emergency phone</Label>
              <Input value={settings.emergencyContact.phone || "—"} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label>Emergency email</Label>
              <Input value={settings.emergencyContact.email || "—"} disabled readOnly />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Preferences</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={language}
                onValueChange={(value) => {
                  if (value) setValue("language", value, { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={timezone}
                onValueChange={(value) => {
                  if (value) setValue("timezone", value, { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save preferences
        </Button>
      </form>
    </section>
  );
}
