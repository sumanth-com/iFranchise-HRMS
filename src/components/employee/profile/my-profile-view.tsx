"use client";

import { format } from "date-fns";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { updateEmployeeSelfProfileAction } from "@/lib/employees/actions";
import type { MyProfileBundle } from "@/types/my-profile";
import { TIMEZONE_OPTIONS } from "@/lib/validations/organization";
import {
  employeeSelfProfileSchema,
  type EmployeeSelfProfileInput,
} from "@/lib/validations/employee";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
] as const;

function ProfileInfoRow({
  label,
  value,
  editing,
  children,
}: {
  label: string;
  value?: string;
  editing?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-4 py-3 last:border-b-0">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium">
        {editing && children ? children : value ?? "—"}
      </dd>
    </div>
  );
}

function formatJoiningDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, "d MMM yyyy");
}

function formatDisplayLabel(value: string | null | undefined) {
  if (!value?.trim()) return "—";
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

type MyProfileViewProps = {
  data: MyProfileBundle;
};

export function MyProfileView({ data }: MyProfileViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const canSubmitProfile = !data.selfProfileSubmittedAt;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeSelfProfileInput>({
    resolver: zodResolver(employeeSelfProfileSchema),
    defaultValues: {
      personalEmail: data.profileSettings.personalEmail,
      personalPhone: data.profileSettings.personalPhone,
      language: data.profileSettings.language,
      timezone: data.profileSettings.timezone,
      addressLine1: data.profileSettings.address.addressLine1,
      addressLine2: data.profileSettings.address.addressLine2,
      city: data.profileSettings.address.city,
      state: data.profileSettings.address.state,
      postalCode: data.profileSettings.address.postalCode,
      country: data.profileSettings.address.country,
      emergencyContactName: data.profileSettings.emergencyContact.name,
      emergencyContactRelationship: data.profileSettings.emergencyContact.relationship,
      emergencyContactPhone: data.profileSettings.emergencyContact.phone,
      emergencyContactEmail: data.profileSettings.emergencyContact.email,
    },
  });

  const language = watch("language");
  const timezone = watch("timezone");
  const fullName = `${data.firstName} ${data.lastName}`.trim();

  function handleCancelEdit() {
    reset();
    setIsEditing(false);
  }

  function handleStartEdit() {
    if (!canSubmitProfile) {
      toast.message("Profile already submitted", {
        description:
          "Your profile details were saved once. Please contact HR if you need further changes.",
      });
      return;
    }
    setIsEditing(true);
  }

  function onSubmit(formData: EmployeeSelfProfileInput) {
    startTransition(async () => {
      const result = await updateEmployeeSelfProfileAction(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Profile saved successfully");
      setIsEditing(false);
      router.refresh();
    });
  }

  const attendanceSummaryText = `${data.attendanceSummary.presentDays} present day(s) · ${data.attendanceSummary.totalWorkHours.toFixed(1)} total hours`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{fullName}</h1>
          <EmploymentStatusBadge status={data.employmentStatus} />
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={handleCancelEdit}
              >
                <X className="size-4" />
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={handleSubmit(onSubmit)}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canSubmitProfile}
              onClick={handleStartEdit}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {!canSubmitProfile && !isEditing ? (
        <p className="text-sm text-muted-foreground">
          Your profile details have been submitted. Contact your HR team if you need to update
          employment or personal information again.
        </p>
      ) : isEditing ? (
        <p className="text-sm text-muted-foreground">
          You can save your personal details once. Employment fields are managed by HR.
        </p>
      ) : null}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,22rem)]"
      >
        <h2 className="text-base font-semibold lg:col-start-1">Employee Information</h2>

        <dl className="overflow-hidden rounded-xl border bg-card lg:col-start-1 lg:row-start-2">
          <ProfileInfoRow label="Employee ID" value={data.employeeCode} />
          <ProfileInfoRow label="Department" value={data.departmentName ?? "—"} />
          <ProfileInfoRow label="Designation" value={data.designationTitle ?? "—"} />
          <ProfileInfoRow
            label="Employment type"
            value={formatDisplayLabel(data.employmentTypeName)}
          />
          <ProfileInfoRow label="Manager" value={data.reportingManagerName ?? "—"} />
          <ProfileInfoRow label="Joining date" value={formatJoiningDate(data.dateOfJoining)} />
          <ProfileInfoRow label="Attendance summary" value={attendanceSummaryText} />
          <ProfileInfoRow label="Company email" value={data.email} />

          <ProfileInfoRow
            label="Personal email"
            value={data.profileSettings.personalEmail || "—"}
            editing={isEditing}
          >
            <div className="w-full max-w-xs">
              <Input
                type="email"
                disabled={isPending}
                className="h-8 text-right"
                {...register("personalEmail")}
              />
              {errors.personalEmail ? (
                <p className="mt-1 text-xs text-destructive">{errors.personalEmail.message}</p>
              ) : null}
            </div>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Personal phone"
            value={data.profileSettings.personalPhone || "—"}
            editing={isEditing}
          >
            <Input
              disabled={isPending}
              className="h-8 max-w-xs text-right"
              {...register("personalPhone")}
            />
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Address"
            value={
              [
                data.profileSettings.address.addressLine1,
                data.profileSettings.address.city,
                data.profileSettings.address.state,
              ]
                .filter(Boolean)
                .join(", ") || "—"
            }
            editing={isEditing}
          >
            <div className="flex w-full max-w-xs flex-col gap-2">
              <Input
                placeholder="Address line 1"
                disabled={isPending}
                className="h-8 text-right"
                {...register("addressLine1")}
              />
              <Input
                placeholder="Address line 2"
                disabled={isPending}
                className="h-8 text-right"
                {...register("addressLine2")}
              />
              <Input
                placeholder="City"
                disabled={isPending}
                className="h-8 text-right"
                {...register("city")}
              />
              <Input
                placeholder="State"
                disabled={isPending}
                className="h-8 text-right"
                {...register("state")}
              />
              <Input
                placeholder="Postal code"
                disabled={isPending}
                className="h-8 text-right"
                {...register("postalCode")}
              />
              <Input
                placeholder="Country"
                disabled={isPending}
                className="h-8 text-right"
                {...register("country")}
              />
            </div>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Emergency contact"
            value={
              data.profileSettings.emergencyContact.name
                ? `${data.profileSettings.emergencyContact.name} (${data.profileSettings.emergencyContact.phone})`
                : "—"
            }
            editing={isEditing}
          >
            <div className="flex w-full max-w-xs flex-col gap-2">
              <Input
                placeholder="Name"
                disabled={isPending}
                className="h-8 text-right"
                {...register("emergencyContactName")}
              />
              <Input
                placeholder="Relationship"
                disabled={isPending}
                className="h-8 text-right"
                {...register("emergencyContactRelationship")}
              />
              <Input
                placeholder="Phone"
                disabled={isPending}
                className="h-8 text-right"
                {...register("emergencyContactPhone")}
              />
              <Input
                placeholder="Email"
                type="email"
                disabled={isPending}
                className="h-8 text-right"
                {...register("emergencyContactEmail")}
              />
              {errors.emergencyContactEmail ? (
                <p className="text-xs text-destructive">{errors.emergencyContactEmail.message}</p>
              ) : null}
            </div>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Language"
            value={LANGUAGE_OPTIONS.find((o) => o.value === data.profileSettings.language)?.label ?? data.profileSettings.language}
            editing={isEditing}
          >
            <Select
              value={language}
              onValueChange={(value) => {
                if (value) setValue("language", value, { shouldValidate: true });
              }}
              disabled={isPending}
            >
              <SelectTrigger className="h-8 max-w-xs">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ProfileInfoRow>

          <ProfileInfoRow label="Timezone" value={data.profileSettings.timezone} editing={isEditing}>
            <Select
              value={timezone}
              onValueChange={(value) => {
                if (value) setValue("timezone", value, { shouldValidate: true });
              }}
              disabled={isPending}
            >
              <SelectTrigger className="h-8 max-w-xs">
                <SelectValue placeholder="Timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ProfileInfoRow>
        </dl>

        <aside className="flex flex-col items-center overflow-visible lg:col-start-2 lg:row-start-2 lg:sticky lg:top-4">
          <EmployeeIdCard
            employeeId={data.employeeId}
            firstName={data.firstName}
            lastName={data.lastName}
            employeeCode={data.employeeCode}
            designation={data.designationTitle}
            departmentName={data.departmentName}
            employmentTypeName={formatDisplayLabel(data.employmentTypeName)}
            accountStatus={data.accountStatus}
            imageUrl={data.profileImageUrl}
            profilePath={data.profilePath}
            canEdit={true}
          />
          <p className="mt-3 max-w-[19rem] text-center text-xs text-muted-foreground">
            Tap the photo on your digital ID to update your profile picture anytime.
          </p>
        </aside>
      </form>
    </div>
  );
}
