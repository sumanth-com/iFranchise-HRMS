"use client";

import { format } from "date-fns";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { NoticeDialog } from "@/components/common/notice-dialog";
import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import { MyProfileFormFields } from "@/components/employee/profile/my-profile-form-fields";
import {
  formatRelationshipLabel,
  normalizeCountryForSelect,
  normalizeRelationshipValue,
} from "@/lib/employee/profile-contact";
import { updateEmployeeSelfProfileAction } from "@/lib/employees/actions";
import { cn } from "@/lib/utils";
import type { MyProfileBundle } from "@/types/my-profile";
import {
  employeeSelfProfilePreferencesOnlySchema,
  employeeSelfProfileSchema,
  type EmployeeSelfProfileInput,
} from "@/lib/validations/employee";

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
  canEditContactDetails?: boolean;
};

export function MyProfileView({
  data,
  canEditContactDetails = false,
}: MyProfileViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const validationSchema = useMemo(
    () =>
      canEditContactDetails
        ? employeeSelfProfileSchema
        : employeeSelfProfilePreferencesOnlySchema,
    [canEditContactDetails],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeSelfProfileInput>({
    resolver: zodResolver(validationSchema) as Resolver<EmployeeSelfProfileInput>,
    defaultValues: {
      personalEmail: data.profileSettings.personalEmail,
      personalPhone: data.profileSettings.personalPhone,
      language: data.profileSettings.language,
      timezone: data.profileSettings.timezone,
      gender: data.profileSettings.gender as EmployeeSelfProfileInput["gender"] | undefined,
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

  const emergencyRelationship = watch("emergencyContactRelationship");
  const gender = watch("gender");
  const personalPhone = watch("personalPhone") ?? "";
  const emergencyContactPhone = watch("emergencyContactPhone") ?? "";
  const addressState = watch("state") ?? "";
  const addressCity = watch("city") ?? "";
  const addressCountry = watch("country") ?? "";
  const relationshipDisplay = formatRelationshipLabel(
    data.profileSettings.emergencyContact.relationship,
  );
  const genderDisplay = formatDisplayLabel(data.profileSettings.gender);

  function resetFormState() {
    reset({
      personalEmail: data.profileSettings.personalEmail,
      personalPhone: data.profileSettings.personalPhone,
      language: data.profileSettings.language,
      timezone: data.profileSettings.timezone,
      gender: data.profileSettings.gender as EmployeeSelfProfileInput["gender"] | undefined,
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
            reportingManagerId: data.reportingManagerId ?? "",
          }
        : formData;

      const result = await updateEmployeeSelfProfileAction(payload);
      if (!result.success) {
        setNotice({
          title: "Could not save profile",
          message: result.message,
        });
        return;
      }
      toast.success("Profile saved successfully");
      setIsEditing(false);
      router.refresh();
    });
  }

  const pathname = usePathname();
  const isCeo = pathname.startsWith("/ceo");
  const isManager = pathname.startsWith("/manager");
  const isEmployee = pathname.startsWith("/employee");
  const isHrPortal = pathname.startsWith("/dashboard");
  const displayName = `${data.firstName} ${data.lastName}`.trim() || data.firstName;
  const roleLine = isCeo
    ? "CEO"
    : [
        data.designationTitle,
        isHrPortal ? "HR" : data.departmentName,
      ]
        .filter(Boolean)
        .join(" · ") || "—";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div className="relative shrink-0 overflow-hidden rounded-2xl border border-primary/15 bg-[#5f55ee] shadow-sm dark:border-primary/25">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              background:
                "radial-gradient(ellipse 80% 120% at 0% 0%, rgba(255,255,255,0.22) 0%, transparent 55%), radial-gradient(ellipse 70% 100% at 100% 100%, rgba(49,46,129,0.35) 0%, transparent 50%), linear-gradient(135deg, #6d64f0 0%, #5f55ee 48%, #4f46e5 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-8 size-56 rounded-full bg-indigo-950/20 blur-3xl"
            aria-hidden
          />

          <div className="relative z-[1] grid min-h-[7.5rem] grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5 sm:min-h-[8.25rem] sm:px-6 sm:py-6">
            <div aria-hidden className="min-w-0" />
            <div className="flex min-w-0 max-w-[min(100%,36rem)] flex-col items-center text-center">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/75">
                My profile
              </p>
              <h1 className="mt-1.5 max-w-full truncate text-2xl font-semibold tracking-tight text-white sm:text-[1.7rem]">
                {displayName}
              </h1>
              <p className="mt-1.5 inline-flex max-w-full items-center rounded-full bg-white/15 px-2.5 py-0.5 text-sm text-white/95 ring-1 ring-white/20 backdrop-blur-sm">
                <span className="truncate">{roleLine}</span>
              </p>
            </div>

            <div className="flex min-w-0 items-center justify-end">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="bg-white/95 text-foreground hover:bg-white"
                    disabled={isPending}
                    onClick={handleCancelEdit}
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-white text-primary hover:bg-white/90"
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
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="bg-white/95 text-foreground hover:bg-white"
                  onClick={handleStartEdit}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>

        <div
          className={cn(
            "mt-4 grid min-h-0 gap-4 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] lg:items-start",
            isEditing && "flex-1 overflow-y-auto overscroll-contain pb-6",
          )}
        >
          <div className="mx-auto flex w-full max-w-[17.5rem] flex-col lg:mx-0 lg:max-w-none">
            <EmployeeIdCard
              employeeId={data.employeeId}
              firstName={data.firstName}
              lastName={data.lastName}
              employeeCode={data.employeeCode}
              designation={isCeo ? "CEO" : data.designationTitle}
              departmentName={data.departmentName}
              employmentTypeName={formatDisplayLabel(data.employmentTypeName)}
              employmentStatus={data.employmentStatus}
              accountStatus={data.accountStatus}
              profileImagePath={data.profileImagePath}
              imageUrl={data.profileImageUrl}
              profilePath={data.profilePath}
              canEdit={true}
              hideHeaderLabel
              className="w-full max-w-full"
            />
            <p className="mt-3 w-full text-center text-[0.8rem] leading-snug text-muted-foreground">
              <span className="font-semibold text-foreground/80">Note:</span> Place your cursor
              over the photo area
              <br />
              on the ID card to upload your profile picture.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-3.5 shadow-xs sm:p-5">
            <input type="hidden" {...register("personalEmail")} />
            <input type="hidden" {...register("timezone")} />
            <input type="hidden" {...register("language")} />

            <MyProfileFormFields
              data={data}
              isEditing={isEditing}
              isPending={isPending}
              isCeo={isCeo}
              isManager={isManager}
              isEmployee={isEmployee}
              canEditContactDetails={canEditContactDetails}
              personalPhone={personalPhone}
              emergencyContactPhone={emergencyContactPhone}
              addressState={addressState}
              addressCity={addressCity}
              addressCountry={addressCountry}
              emergencyRelationship={emergencyRelationship}
              relationshipDisplay={relationshipDisplay}
              genderDisplay={genderDisplay}
              gender={gender}
              formatJoiningDate={formatJoiningDate}
              register={register}
              setValue={setValue}
              errors={errors}
            />
          </div>
        </div>
      </form>

      <NoticeDialog
        open={notice != null}
        onOpenChange={(open) => {
          if (!open) setNotice(null);
        }}
        title={notice?.title ?? "Notice"}
        message={notice?.message ?? ""}
      />
    </div>
  );
}
