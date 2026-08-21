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
import { PhoneInput } from "@/components/common/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { SearchableSelect } from "@/components/common/searchable-select";
import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import {
  EMERGENCY_RELATIONSHIP_OPTIONS,
  formatRelationshipLabel,
  normalizeCountryForSelect,
  normalizeRelationshipValue,
} from "@/lib/employee/profile-contact";
import { COUNTRIES, INDIAN_STATES, STATE_DISTRICTS } from "@/lib/geo/india";
import { updateEmployeeSelfProfileAction } from "@/lib/employees/actions";
import type { MyProfileBundle } from "@/types/my-profile";
import {
  employeeSelfProfileSchema,
  type EmployeeSelfProfileInput,
} from "@/lib/validations/employee";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
] as const;

const PROFILE_SELECT_CONTENT_CLASS = "min-w-[14rem] max-w-[20rem]";

function ProfileFieldControl({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "w-full max-w-md" : "w-full max-w-xs"}>{children}</div>
  );
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
  children?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b px-4 py-3 last:border-b-0 sm:gap-6">
      <dt className="w-32 shrink-0 pt-0.5 text-sm text-muted-foreground sm:w-36">{label}</dt>
      <dd
        className={`min-w-0 flex-1 text-right text-sm font-medium ${valueClassName ?? ""}`}
      >
        {editing && children ? (
          <div className="flex justify-end">{children}</div>
        ) : (
          value ?? "—"
        )}
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

type ManagerOption = {
  value: string;
  label: string;
};

type MyProfileViewProps = {
  data: MyProfileBundle;
  canEditContactDetails?: boolean;
  canEditReportingManager?: boolean;
  managerOptions?: ManagerOption[];
};

export function MyProfileView({
  data,
  canEditContactDetails = false,
  canEditReportingManager = false,
  managerOptions = [],
}: MyProfileViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

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
      country: normalizeCountryForSelect(data.profileSettings.address.country),
      emergencyContactName: data.profileSettings.emergencyContact.name,
      emergencyContactRelationship: normalizeRelationshipValue(
        data.profileSettings.emergencyContact.relationship,
      ),
      emergencyContactPhone: data.profileSettings.emergencyContact.phone,
      emergencyContactEmail: data.profileSettings.emergencyContact.email,
      reportingManagerId: data.reportingManagerId ?? "",
    },
  });

  const language = watch("language");
  const emergencyRelationship = watch("emergencyContactRelationship");
  const reportingManagerId = watch("reportingManagerId");
  const personalPhone = watch("personalPhone") ?? "";
  const emergencyContactPhone = watch("emergencyContactPhone") ?? "";
  const addressState = watch("state") ?? "";
  const addressCity = watch("city") ?? "";
  const addressCountry = watch("country") ?? "";
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const relationshipDisplay = formatRelationshipLabel(
    data.profileSettings.emergencyContact.relationship,
  );

  function resetFormState() {
    reset({
      personalEmail: data.profileSettings.personalEmail,
      personalPhone: data.profileSettings.personalPhone,
      language: data.profileSettings.language,
      timezone: data.profileSettings.timezone,
      addressLine1: data.profileSettings.address.addressLine1,
      addressLine2: data.profileSettings.address.addressLine2,
      city: data.profileSettings.address.city,
      state: data.profileSettings.address.state,
      postalCode: data.profileSettings.address.postalCode,
      country: normalizeCountryForSelect(data.profileSettings.address.country),
      emergencyContactName: data.profileSettings.emergencyContact.name,
      emergencyContactRelationship: normalizeRelationshipValue(
        data.profileSettings.emergencyContact.relationship,
      ),
      emergencyContactPhone: data.profileSettings.emergencyContact.phone,
      emergencyContactEmail: data.profileSettings.emergencyContact.email,
      reportingManagerId: data.reportingManagerId ?? "",
    });
  }

  function handleCancelEdit() {
    resetFormState();
    setIsEditing(false);
  }

  function handleStartEdit() {
    resetFormState();
    setIsEditing(true);
  }

  function onSubmit(formData: EmployeeSelfProfileInput) {
    startTransition(async () => {
      const payload: EmployeeSelfProfileInput = canEditContactDetails
        ? {
            ...formData,
            emergencyContactRelationship:
              formData.emergencyContactRelationship?.trim() || "",
            reportingManagerId: canEditReportingManager
              ? formData.reportingManagerId
              : data.reportingManagerId ?? "",
          }
        : formData;

      const result = await updateEmployeeSelfProfileAction(payload);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Profile saved successfully");
      setIsEditing(false);
      router.refresh();
    });
  }

  const helperText = isEditing
    ? canEditContactDetails
      ? canEditReportingManager
        ? "Save your personal and contact details. Employment fields are managed separately."
        : "Save your phone, address, and emergency contact. Employment fields stay read-only."
      : "Save your language preference. Contact, address, and emergency details are managed by HR."
    : canEditContactDetails
      ? "View and update your personal contact details below. Employment information is managed separately."
      : "View your employment and contact details below. You can update language and profile photo. Other fields are managed by HR.";

  const selectedManagerLabel =
    !reportingManagerId || reportingManagerId === "none"
      ? "None"
      : managerOptions.find((option) => option.value === reportingManagerId)?.label ??
        (reportingManagerId === data.reportingManagerId
          ? data.reportingManagerName
          : null) ??
        "Select manager";

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
              onClick={handleStartEdit}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{helperText}</p>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,22rem)]"
      >
        <h2 className="text-base font-semibold lg:col-start-1">Employee Information</h2>

        <dl className="rounded-xl border bg-card lg:col-start-1 lg:row-start-2">
          <input type="hidden" {...register("personalEmail")} />
          <input type="hidden" {...register("timezone")} />

          <ProfileInfoRow
            label="Manager"
            value={data.reportingManagerName ?? "—"}
            editing={isEditing && canEditReportingManager}
          >
            <ProfileFieldControl>
              <Select
                value={reportingManagerId || "none"}
                onValueChange={(value) => {
                  if (!value) return;
                  setValue("reportingManagerId", value === "none" ? "" : value, {
                    shouldValidate: true,
                  });
                }}
                disabled={isPending}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select manager">
                    {() => selectedManagerLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="end"
                  alignItemWithTrigger={false}
                  className={PROFILE_SELECT_CONTENT_CLASS}
                >
                  <SelectItem value="none">None</SelectItem>
                  {managerOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ProfileFieldControl>
          </ProfileInfoRow>
          <ProfileInfoRow label="Joining date" value={formatJoiningDate(data.dateOfJoining)} />
          <ProfileInfoRow label="Company email" value={data.email} />

          <ProfileInfoRow
            label="Personal phone"
            value={data.profileSettings.personalPhone || "—"}
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl>
              <PhoneInput
                id="personalPhone"
                value={personalPhone}
                onChange={(value) =>
                  setValue("personalPhone", value, { shouldValidate: true })
                }
                disabled={isPending}
                size="sm"
                showHint
                error={errors.personalPhone?.message}
              />
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Address line 1"
            value={data.profileSettings.address.addressLine1 || "—"}
            valueClassName="leading-snug whitespace-normal"
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl wide>
              <Input
                placeholder="Street, building, area"
                disabled={isPending}
                className="h-8 w-full text-right"
                {...register("addressLine1")}
              />
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Address line 2"
            value={data.profileSettings.address.addressLine2 || "—"}
            valueClassName="leading-snug whitespace-normal"
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl wide>
              <Input
                placeholder="Apartment, suite, landmark (optional)"
                disabled={isPending}
                className="h-8 w-full text-right"
                {...register("addressLine2")}
              />
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="City"
            value={data.profileSettings.address.city || "—"}
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl wide>
              <SearchableSelect
                options={(STATE_DISTRICTS[addressState] ?? []).map((district) => ({
                  value: district,
                  label: district,
                }))}
                value={addressCity || null}
                onValueChange={(value) =>
                  setValue("city", value ?? "", { shouldValidate: true })
                }
                placeholder="Search city…"
                allowNone={false}
                disabled={isPending}
                emptyMessage={
                  addressState ? "No matches — type to search" : "Select a state below first"
                }
              />
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="State"
            value={data.profileSettings.address.state || "—"}
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl wide>
              <SearchableSelect
                options={INDIAN_STATES.map((state) => ({ value: state, label: state }))}
                value={addressState || null}
                onValueChange={(value) => {
                  setValue("state", value ?? "", { shouldValidate: true });
                  setValue("city", "", { shouldValidate: true });
                }}
                placeholder="Search state…"
                allowNone={false}
                disabled={isPending}
              />
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Postal code"
            value={data.profileSettings.address.postalCode || "—"}
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl>
              <Input
                placeholder="Postal code"
                disabled={isPending}
                className="h-8 w-full text-right"
                {...register("postalCode")}
              />
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Country"
            value={normalizeCountryForSelect(data.profileSettings.address.country) || "—"}
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl wide>
              <SearchableSelect
                options={COUNTRIES.map((country) => ({ value: country, label: country }))}
                value={addressCountry || null}
                onValueChange={(value) =>
                  setValue("country", value ?? "", { shouldValidate: true })
                }
                placeholder="Search country…"
                allowNone={false}
                disabled={isPending}
              />
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Emergency relation"
            value={relationshipDisplay}
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl>
              <Select
                value={emergencyRelationship || undefined}
                onValueChange={(value) => {
                  if (value) {
                    setValue("emergencyContactRelationship", value, { shouldValidate: true });
                  }
                }}
                disabled={isPending}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select relationship" />
                </SelectTrigger>
                <SelectContent
                  align="end"
                  alignItemWithTrigger={false}
                  className={PROFILE_SELECT_CONTENT_CLASS}
                >
                  {EMERGENCY_RELATIONSHIP_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Emergency name"
            value={data.profileSettings.emergencyContact.name || "—"}
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl>
              <Input
                placeholder="Name"
                disabled={isPending}
                className="h-8 w-full text-right"
                {...register("emergencyContactName")}
              />
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Emergency contact"
            value={data.profileSettings.emergencyContact.phone || "—"}
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl>
              <PhoneInput
                id="emergencyContactPhone"
                value={emergencyContactPhone}
                onChange={(value) =>
                  setValue("emergencyContactPhone", value, { shouldValidate: true })
                }
                disabled={isPending}
                size="sm"
                showHint
                error={errors.emergencyContactPhone?.message}
              />
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Emergency email"
            value={data.profileSettings.emergencyContact.email || "—"}
            editing={isEditing && canEditContactDetails}
          >
            <ProfileFieldControl>
              <div className="flex flex-col gap-1">
                <Input
                  placeholder="Email"
                  type="email"
                  disabled={isPending}
                  className="h-8 w-full text-right"
                  {...register("emergencyContactEmail")}
                />
                {errors.emergencyContactEmail ? (
                  <p className="text-xs text-destructive text-right">
                    {errors.emergencyContactEmail.message}
                  </p>
                ) : null}
              </div>
            </ProfileFieldControl>
          </ProfileInfoRow>

          <ProfileInfoRow
            label="Language"
            value={
              LANGUAGE_OPTIONS.find((o) => o.value === data.profileSettings.language)?.label ??
              data.profileSettings.language
            }
            editing={isEditing}
          >
            <ProfileFieldControl>
              <Select
                value={language}
                onValueChange={(value) => {
                  if (value) setValue("language", value, { shouldValidate: true });
                }}
                disabled={isPending}
              >
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Language">
                    {(value) =>
                      LANGUAGE_OPTIONS.find((option) => option.value === value)?.label ??
                      "Language"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent
                  align="end"
                  alignItemWithTrigger={false}
                  className={PROFILE_SELECT_CONTENT_CLASS}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ProfileFieldControl>
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
            employmentStatus={data.employmentStatus}
            imageUrl={data.profileImageUrl}
            profilePath={data.profilePath}
            canEdit={true}
          />
          <p className="mt-3 max-w-[19rem] text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Tap the photo on your digital ID to update your profile picture anytime.
          </p>
        </aside>
      </form>
    </div>
  );
}
