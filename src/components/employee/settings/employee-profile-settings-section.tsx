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
import {
  removeProfileImageAction,
  updateEmployeeSelfProfileAction,
  uploadProfileImageAction,
} from "@/lib/employees/actions";
import type { EmployeeSelfProfileSettings } from "@/lib/employee/services/employee-self-profile";
import { TIMEZONE_OPTIONS } from "@/lib/validations/organization";
import {
  employeeSelfProfileSchema,
  type EmployeeSelfProfileInput,
} from "@/lib/validations/employee";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
] as const;

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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeSelfProfileInput>({
    resolver: zodResolver(employeeSelfProfileSchema),
    defaultValues: {
      firstName: settings.firstName,
      lastName: settings.lastName,
      phone: settings.phone,
      preferredName: settings.preferredName,
      language: settings.language,
      timezone: settings.timezone,
      addressLine1: settings.address.addressLine1,
      addressLine2: settings.address.addressLine2,
      city: settings.address.city,
      state: settings.address.state,
      postalCode: settings.address.postalCode,
      country: settings.address.country,
      emergencyContactName: settings.emergencyContact.name,
      emergencyContactRelationship: settings.emergencyContact.relationship,
      emergencyContactPhone: settings.emergencyContact.phone,
      emergencyContactEmail: settings.emergencyContact.email,
    },
  });

  const language = watch("language");
  const timezone = watch("timezone");

  function onSubmit(data: EmployeeSelfProfileInput) {
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
          Update your personal details, contact information, and preferences.
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
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" disabled={isPending} {...register("firstName")} />
            {errors.firstName ? (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" disabled={isPending} {...register("lastName")} />
            {errors.lastName ? (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            ) : null}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Company email</Label>
            <Input value={settings.email} disabled readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" disabled={isPending} {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredName">Preferred name</Label>
            <Input
              id="preferredName"
              placeholder="How you prefer to be addressed"
              disabled={isPending}
              {...register("preferredName")}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Address</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="addressLine1">Address line 1</Label>
              <Input id="addressLine1" disabled={isPending} {...register("addressLine1")} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="addressLine2">Address line 2</Label>
              <Input id="addressLine2" disabled={isPending} {...register("addressLine2")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" disabled={isPending} {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" disabled={isPending} {...register("state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" disabled={isPending} {...register("postalCode")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" disabled={isPending} {...register("country")} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium">Emergency contact</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="emergencyContactName">Name</Label>
              <Input
                id="emergencyContactName"
                disabled={isPending}
                {...register("emergencyContactName")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactRelationship">Relationship</Label>
              <Input
                id="emergencyContactRelationship"
                disabled={isPending}
                {...register("emergencyContactRelationship")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactPhone">Phone</Label>
              <Input
                id="emergencyContactPhone"
                disabled={isPending}
                {...register("emergencyContactPhone")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyContactEmail">Email</Label>
              <Input
                id="emergencyContactEmail"
                type="email"
                disabled={isPending}
                {...register("emergencyContactEmail")}
              />
              {errors.emergencyContactEmail ? (
                <p className="text-xs text-destructive">
                  {errors.emergencyContactEmail.message}
                </p>
              ) : null}
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
          Save profile
        </Button>
      </form>
    </section>
  );
}
