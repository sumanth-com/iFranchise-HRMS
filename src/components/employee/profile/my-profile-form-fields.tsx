"use client";

import type { FieldErrors, UseFormRegister, UseFormSetValue } from "react-hook-form";

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
import { Label } from "@/components/ui/label";
import {
  EMERGENCY_RELATIONSHIP_OPTIONS,
  normalizeCountryForSelect,
} from "@/lib/employee/profile-contact";
import { COUNTRIES, INDIAN_STATES, STATE_DISTRICTS } from "@/lib/geo/india";
import { cn } from "@/lib/utils";
import type { MyProfileBundle } from "@/types/my-profile";
import type { EmployeeSelfProfileInput } from "@/lib/validations/employee";

const PROFILE_SELECT_CONTENT_CLASS = "min-w-[14rem] max-w-[20rem]";

const PROFILE_GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
] as const;

function ProfileFieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function ProfileFormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

function ProfileReadonlyValue({ value }: { value?: string | null }) {
  return (
    <p className="min-h-8 rounded-md border border-border/60 bg-muted/25 px-3 py-1.5 text-sm font-medium text-foreground">
      {value?.trim() ? value : "—"}
    </p>
  );
}

type MyProfileFormFieldsProps = {
  data: MyProfileBundle;
  isEditing: boolean;
  isPending: boolean;
  isCeo: boolean;
  isManager: boolean;
  isEmployee: boolean;
  canEditContactDetails: boolean;
  personalPhone: string;
  emergencyContactPhone: string;
  addressState: string;
  addressCity: string;
  addressCountry: string;
  emergencyRelationship: string | undefined;
  relationshipDisplay: string;
  genderDisplay: string;
  gender: string | undefined;
  formatJoiningDate: (value: string | null) => string;
  register: UseFormRegister<EmployeeSelfProfileInput>;
  setValue: UseFormSetValue<EmployeeSelfProfileInput>;
  errors: FieldErrors<EmployeeSelfProfileInput>;
};

export function MyProfileFormFields({
  data,
  isEditing,
  isPending,
  isCeo,
  isManager,
  isEmployee,
  canEditContactDetails,
  personalPhone,
  emergencyContactPhone,
  addressState,
  addressCity,
  addressCountry,
  emergencyRelationship,
  relationshipDisplay,
  genderDisplay,
  gender,
  formatJoiningDate,
  register,
  setValue,
  errors,
}: MyProfileFormFieldsProps) {
  const editingContact = isEditing && canEditContactDetails;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {isEmployee ? (
        <ProfileFormField label="Manager">
          <ProfileReadonlyValue value={data.reportingManagerName} />
        </ProfileFormField>
      ) : isManager && data.reportingManagerName ? (
        <ProfileFormField label="HR">
          <ProfileReadonlyValue value={data.reportingManagerName} />
        </ProfileFormField>
      ) : null}

      {!isCeo ? (
        <ProfileFormField label="Assigned HR">
          <ProfileReadonlyValue value={data.assignedHrName} />
        </ProfileFormField>
      ) : null}

      {!isCeo ? (
        <ProfileFormField label="Joining date">
          <ProfileReadonlyValue value={formatJoiningDate(data.dateOfJoining)} />
        </ProfileFormField>
      ) : null}

      <ProfileFormField label="Gender" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <Select
              value={gender ?? ""}
              onValueChange={(value) => {
                if (!value) return;
                setValue(
                  "gender",
                  value as EmployeeSelfProfileInput["gender"],
                  { shouldValidate: true },
                );
              }}
              disabled={isPending}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent className={PROFILE_SELECT_CONTENT_CLASS}>
                {PROFILE_GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ProfileFieldError message={errors.gender?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue value={genderDisplay} />
        )}
      </ProfileFormField>

      <ProfileFormField label="Company email">
        <ProfileReadonlyValue value={data.email} />
      </ProfileFormField>

      <ProfileFormField label="Personal phone" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <PhoneInput
              id="personalPhone"
              value={personalPhone}
              onChange={(value) => setValue("personalPhone", value, { shouldValidate: true })}
              disabled={isPending}
              size="sm"
              showHint
              required={editingContact}
              error={errors.personalPhone?.message}
            />
          </div>
        ) : (
          <ProfileReadonlyValue value={data.profileSettings.personalPhone} />
        )}
      </ProfileFormField>

      <ProfileFormField label="Address line 1" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <Input
              placeholder="Street, building, area"
              disabled={isPending}
              className="h-9 w-full"
              {...register("addressLine1")}
            />
            <ProfileFieldError message={errors.addressLine1?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue value={data.profileSettings.address.addressLine1} />
        )}
      </ProfileFormField>

      <ProfileFormField label="Address line 2" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <Input
              placeholder="Apartment, suite, landmark"
              disabled={isPending}
              className="h-9 w-full"
              {...register("addressLine2")}
            />
            <ProfileFieldError message={errors.addressLine2?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue value={data.profileSettings.address.addressLine2} />
        )}
      </ProfileFormField>

      <ProfileFormField label="State" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
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
            <ProfileFieldError message={errors.state?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue value={data.profileSettings.address.state} />
        )}
      </ProfileFormField>

      <ProfileFormField label="City" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <SearchableSelect
              options={(STATE_DISTRICTS[addressState] ?? []).map((district) => ({
                value: district,
                label: district,
              }))}
              value={addressCity || null}
              onValueChange={(value) => setValue("city", value ?? "", { shouldValidate: true })}
              placeholder="Search city…"
              allowNone={false}
              disabled={isPending}
              emptyMessage={
                addressState ? "No matches — type to search" : "Select a state first"
              }
            />
            <ProfileFieldError message={errors.city?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue value={data.profileSettings.address.city} />
        )}
      </ProfileFormField>

      <ProfileFormField label="Postal code" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <Input
              placeholder="Postal code"
              disabled={isPending}
              className="h-9 w-full"
              {...register("postalCode")}
            />
            <ProfileFieldError message={errors.postalCode?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue value={data.profileSettings.address.postalCode} />
        )}
      </ProfileFormField>

      <ProfileFormField label="Country" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <SearchableSelect
              options={COUNTRIES.map((country) => ({ value: country, label: country }))}
              value={addressCountry || null}
              onValueChange={(value) => setValue("country", value ?? "", { shouldValidate: true })}
              placeholder="Search country…"
              allowNone={false}
              disabled={isPending}
            />
            <ProfileFieldError message={errors.country?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue
            value={normalizeCountryForSelect(data.profileSettings.address.country)}
          />
        )}
      </ProfileFormField>

      <ProfileFormField label="Emergency relation" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <Select
              value={emergencyRelationship || undefined}
              onValueChange={(value) => {
                if (value) {
                  setValue("emergencyContactRelationship", value, { shouldValidate: true });
                }
              }}
              disabled={isPending}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent className={PROFILE_SELECT_CONTENT_CLASS}>
                {EMERGENCY_RELATIONSHIP_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ProfileFieldError message={errors.emergencyContactRelationship?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue value={relationshipDisplay} />
        )}
      </ProfileFormField>

      <ProfileFormField label="Emergency name" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <Input
              placeholder="Name"
              disabled={isPending}
              className="h-9 w-full"
              {...register("emergencyContactName")}
            />
            <ProfileFieldError message={errors.emergencyContactName?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue value={data.profileSettings.emergencyContact.name} />
        )}
      </ProfileFormField>

      <ProfileFormField label="Emergency contact" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <PhoneInput
              id="emergencyContactPhone"
              value={emergencyContactPhone}
              onChange={(value) =>
                setValue("emergencyContactPhone", value, { shouldValidate: true })
              }
              disabled={isPending}
              size="sm"
              showHint
              required={editingContact}
              error={errors.emergencyContactPhone?.message}
            />
          </div>
        ) : (
          <ProfileReadonlyValue value={data.profileSettings.emergencyContact.phone} />
        )}
      </ProfileFormField>

      <ProfileFormField label="Emergency email" required={editingContact}>
        {editingContact ? (
          <div className="space-y-1">
            <Input
              placeholder="Email"
              type="email"
              disabled={isPending}
              className="h-9 w-full"
              {...register("emergencyContactEmail")}
            />
            <ProfileFieldError message={errors.emergencyContactEmail?.message} />
          </div>
        ) : (
          <ProfileReadonlyValue value={data.profileSettings.emergencyContact.email} />
        )}
      </ProfileFormField>
    </div>
  );
}
