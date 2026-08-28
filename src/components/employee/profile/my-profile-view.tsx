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
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const validationSchema = useMemo(
    () =>
      canEditContactDetails
        ? employeeSelfProfileSchema
        : employeeSelfProfilePreferencesOnlySchema,
    [canEditContactDetails],
  );
  const contactFieldsRequired = canEditContactDetails;

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
  const reportingManagerId = watch("reportingManagerId");
  const personalPhone = watch("personalPhone") ?? "";
  const emergencyContactPhone = watch("emergencyContactPhone") ?? "";
  const addressState = watch("state") ?? "";
  const addressCity = watch("city") ?? "";
  const addressCountry = watch("country") ?? "";
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

  const selectedManagerLabel =
    !reportingManagerId || reportingManagerId === "none"
      ? "None"
      : managerOptions.find((option) => option.value === reportingManagerId)?.label ??
        (reportingManagerId === data.reportingManagerId
          ? data.reportingManagerName
          : null) ??
        "Select manager";

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
        <div
          className="relative shrink-0 overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary via-primary/95 to-indigo-600 px-4 py-5 sm:px-6 sm:py-6 dark:border-primary/30 dark:from-primary/90 dark:via-indigo-950 dark:to-slate-950"
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.22] dark:hidden"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.35) 42%, transparent 42%), linear-gradient(225deg, transparent 45%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.2) 47%, transparent 47%)",
              backgroundSize: "48px 48px",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 hidden opacity-[0.14] dark:block"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.12) 40%, rgba(255,255,255,0.12) 42%, transparent 42%), linear-gradient(225deg, transparent 45%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.08) 47%, transparent 47%)",
              backgroundSize: "48px 48px",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/10 dark:from-white/5 dark:to-black/35"
            aria-hidden
          />
          <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
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
          <div className="relative z-[1] flex flex-col items-center px-10 py-1 text-center sm:px-14">
            <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/80">
              My profile
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-primary-foreground sm:text-[1.65rem]">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-primary-foreground/85">{roleLine}</p>
          </div>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] lg:items-stretch">
          <div className="mx-auto flex w-full max-w-[17.5rem] flex-col self-stretch lg:mx-0">
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
              stretchHeight
              className="h-full w-full max-w-full shadow-md"
            />
          </div>

          <div className="self-stretch rounded-xl border bg-card p-3.5 shadow-xs sm:p-5">
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
              canEditReportingManager={canEditReportingManager}
              contactFieldsRequired={contactFieldsRequired}
              personalPhone={personalPhone}
              emergencyContactPhone={emergencyContactPhone}
              addressState={addressState}
              addressCity={addressCity}
              addressCountry={addressCountry}
              emergencyRelationship={emergencyRelationship}
              reportingManagerId={reportingManagerId}
              selectedManagerLabel={selectedManagerLabel}
              managerOptions={managerOptions}
              relationshipDisplay={relationshipDisplay}
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
