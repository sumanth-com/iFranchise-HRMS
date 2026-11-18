"use client";

import { format } from "date-fns";
import {
  BriefcaseBusiness,
  CalendarDays,
  Copy,
  Loader2,
  Pencil,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { NoticeDialog } from "@/components/common/notice-dialog";
import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import { AccountPasswordResetSection } from "@/components/auth/account-password-reset-section";
import { SettingsResignationModalSection } from "@/components/settings/settings-resignation-modal-section";
import { MyProfileFormFields } from "@/components/employee/profile/my-profile-form-fields";
import {
  formatRelationshipLabel,
  normalizeCountryForSelect,
  normalizeRelationshipValue,
} from "@/lib/employee/profile-contact";
import { updateEmployeeSelfProfileAction } from "@/lib/employees/actions";
import { cn } from "@/lib/utils";
import type { MyProfileBundle } from "@/types/my-profile";
import type { ExitResignationItem } from "@/types/exit";
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

function ProfileInfoRow({
  label,
  value,
  className,
  action,
}: {
  label: string;
  value?: string | null;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(7.5rem,0.9fr)_minmax(0,1.1fr)] gap-3 border-b border-border/60 py-2.5 last:border-0", className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5 break-words text-sm font-medium text-foreground">
        <span className="min-w-0 break-words">{value?.trim() || "—"}</span>
        {action}
      </dd>
    </div>
  );
}

function ProfileSectionHeading({ title }: { title: string }) {
  return (
    <h2 className="border-b border-border/60 px-4 py-3 text-base font-semibold tracking-tight sm:px-6">
      {title}
    </h2>
  );
}

type MyProfileViewProps = {
  data: MyProfileBundle;
  canEditContactDetails?: boolean;
  resignation?: {
    canApply: boolean;
    employeeId: string;
    defaultNoticePeriodDays: number;
    activeResignation: ExitResignationItem | null;
    rejectedResignation: ExitResignationItem | null;
  };
};

export function MyProfileView({
  data,
  canEditContactDetails = false,
  resignation,
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

  async function copyEmployeeId() {
    try {
      await navigator.clipboard.writeText(data.employeeCode);
      toast.success("Employee ID copied");
    } catch {
      toast.error("Could not copy employee ID");
    }
  }

  const pathname = usePathname();
  const isCeo = pathname.startsWith("/ceo");
  const isManager = pathname.startsWith("/manager");
  const isEmployee = pathname.startsWith("/employee");
  const profileSummary = [
    { label: "Joining Date", value: formatJoiningDate(data.dateOfJoining), icon: <CalendarDays className="size-5" /> },
    { label: "Assigned HR", value: data.assignedHrName || "—", icon: <BriefcaseBusiness className="size-5" /> },
    { label: "Assigned Manager", value: data.reportingManagerName || "—", icon: <UserRound className="size-5" /> },
    { label: "Employment Type", value: formatDisplayLabel(data.employmentTypeName), icon: <ShieldCheck className="size-5" />, isPill: true },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              My Profile
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              View and manage your personal and employment information.
            </p>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleCancelEdit}>
                <X className="size-4" /> Cancel
              </Button>
              <Button type="button" size="sm" disabled={isPending} onClick={handleSubmit(onSubmit)}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </Button>
            </div>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={handleStartEdit}>
              <Pencil className="size-4" /> Edit Profile
            </Button>
          )}
        </div>

        <input type="hidden" {...register("personalEmail")} />
        {data.profileSettings.emergencyContact.email?.trim() ? (
          <input type="hidden" {...register("emergencyContactEmail")} />
        ) : null}
        <input type="hidden" {...register("timezone")} />
        <input type="hidden" {...register("language")} />

        <div className={cn(
          "mt-4 grid min-h-0 gap-x-4 gap-y-0 pb-6 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]",
          isEditing ? "xl:items-start" : "xl:items-stretch",
        )}>
          <div className="mx-auto w-full max-w-[19rem] xl:mx-0 xl:h-full xl:max-w-none">
            <EmployeeIdCard
              employeeId={data.employeeId}
              firstName={data.firstName}
              lastName={data.lastName}
              employeeCode={data.employeeCode}
              designation={data.designationTitle}
              departmentName={data.departmentName}
              employmentTypeName={formatDisplayLabel(data.employmentTypeName)}
              employmentStatus={data.employmentStatus}
              accountStatus={data.accountStatus}
              profileImagePath={data.profileImagePath}
              imageUrl={data.profileImageUrl}
              profilePath={data.profilePath}
              canEdit={false}
              hideHeaderLabel
              hideEmploymentType
              hideEmployeeCode
              stretchHeight={!isEditing}
              compactFooter
              className="h-[27.5rem] w-full max-w-full xl:h-full"
            />
          </div>

          {isEditing ? (
            <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-5 xl:col-start-2">
              <MyProfileFormFields
                data={data}
                isEditing
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
          ) : (
            <div className="min-w-0 space-y-4 xl:col-start-2">
              <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:grid-cols-2 sm:gap-0 lg:grid-cols-3 xl:grid-cols-4">
                {profileSummary.map((item, index) => (
                  <div
                    key={item.label}
                    className={cn(
                      "flex min-w-0 items-start gap-3 px-2 py-2 sm:border-r sm:border-border/60",
                      index === profileSummary.length - 1 && "sm:border-r-0",
                    )}
                  >
                    <span className="mt-0.5 shrink-0 text-muted-foreground">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                      {item.isPill ? (
                        <span className="mt-1 inline-flex max-w-full rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">
                          {item.value}
                        </span>
                      ) : (
                        <p className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </section>

              <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                <ProfileSectionHeading title="Employee Information" />
                <dl className="grid gap-x-8 px-4 py-2 sm:grid-cols-2 sm:px-5">
                  <ProfileInfoRow label="Department" value={data.departmentName} />
                  <ProfileInfoRow
                    label="Employee ID"
                    value={data.employeeCode}
                    action={
                      <button
                        type="button"
                        onClick={copyEmployeeId}
                        disabled={!data.employeeCode}
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
                        aria-label="Copy employee ID"
                        title="Copy employee ID"
                      >
                        <Copy className="size-3.5" aria-hidden />
                      </button>
                    }
                  />
                </dl>
                <dl className="grid gap-x-8 px-4 py-2 sm:grid-cols-2 sm:px-5">
                  <ProfileInfoRow label="Personal Number" value={data.profileSettings.personalPhone} />
                  <ProfileInfoRow label="Company Email" value={data.email} />
                  <ProfileInfoRow label="Gender" value={genderDisplay} />
                  <ProfileInfoRow label="Address" value={[data.profileSettings.address.addressLine1, data.profileSettings.address.addressLine2].filter(Boolean).join(", ")} />
                  <ProfileInfoRow label="City / State" value={[data.profileSettings.address.city, data.profileSettings.address.state].filter(Boolean).join(", ")} />
                  <ProfileInfoRow label="Country" value={data.profileSettings.address.country} />
                  <ProfileInfoRow label="Postal Code" value={data.profileSettings.address.postalCode} />
                  <ProfileInfoRow label="Emergency Relation" value={relationshipDisplay} />
                  <ProfileInfoRow label="Emergency Name" value={data.profileSettings.emergencyContact.name} />
                  <ProfileInfoRow label="Emergency Contact" value={data.profileSettings.emergencyContact.phone} />
                </dl>
              </section>

            </div>
          )}

          {!isEditing ? (
            <>
              <aside className="mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-neutral-900 shadow-sm xl:col-start-1 dark:border-neutral-200 dark:bg-white dark:text-neutral-900">
                <p className="text-sm font-semibold">Need to update your employment details?</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                  Please contact your HR team for assistance with changes to your employment information.
                </p>
              </aside>
              <div className={cn("mt-4 grid gap-4 xl:col-start-2", resignation && "lg:grid-cols-2")}>
                <AccountPasswordResetSection email={data.email} className="h-full" />
                {resignation ? (
                  <SettingsResignationModalSection
                    title="Resignation"
                    description="Submit your resignation and track approval status."
                    canApply={resignation.canApply}
                    employeeId={resignation.employeeId}
                    defaultNoticePeriodDays={resignation.defaultNoticePeriodDays}
                    activeResignation={resignation.activeResignation}
                    rejectedResignation={resignation.rejectedResignation}
                    className="h-full"
                  />
                ) : null}
              </div>
            </>
          ) : null}
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
