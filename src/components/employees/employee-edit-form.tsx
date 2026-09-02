"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { NoticeDialog } from "@/components/common/notice-dialog";
import { PhoneInput } from "@/components/common/phone-input";
import { SearchableSelect } from "@/components/common/searchable-select";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { toEmployeeSelectItems, toLookupSelectItems } from "@/components/payroll/select-utils";
import { updateEmployeeAction } from "@/lib/employees/actions";
import {
  DESIGNATION_OTHER_VALUE,
  resolveEmployeeModuleRoutes,
  type EmployeeModuleRoutes,
} from "@/lib/employees/constants";
import { sortEmploymentTypeOptions } from "@/lib/employees/employment-type-display";
import { COUNTRIES, INDIAN_STATES, STATE_DISTRICTS } from "@/lib/geo/india";
import {
  employeeUpdateSchema,
  type EmployeeUpdateInput,
} from "@/lib/validations/employee";
import { todayIsoDateLocal } from "@/lib/validations/date";
import type { EmployeeDetail, LookupOption } from "@/types/employee";

function firstFormErrorMessage(errors: Record<string, { message?: string }>): string | null {
  for (const value of Object.values(errors)) {
    if (value?.message) return value.message;
  }
  return null;
}

type EmployeeEditFormProps = {
  employee: EmployeeDetail;
  lookups: {
    branches: LookupOption[];
    departments: LookupOption[];
    designations: LookupOption[];
    employmentTypes: LookupOption[];
    managers: LookupOption[];
    hrApprovers?: LookupOption[];
  };
  variant?: "page" | "inline";
  onCancel?: () => void;
  onSaved?: () => void;
  onEmploymentTypeChange?: (typeName: string | null) => void;
  onDesignationChange?: (designationTitle: string | null) => void;
  /** Prefer this from RSC pages — route builders cannot cross the server/client boundary. */
  routesBasePath?: string;
  /** Client-to-client only. Prefer `routesBasePath` when rendering from a server page. */
  routes?: EmployeeModuleRoutes;
};

export function EmployeeEditForm({
  employee,
  lookups,
  variant = "page",
  onCancel,
  routesBasePath,
  routes: routesProp,
  onSaved,
  onEmploymentTypeChange,
  onDesignationChange,
}: EmployeeEditFormProps) {
  const routes = routesProp ?? resolveEmployeeModuleRoutes(routesBasePath);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(null);
  const maxDateToday = todayIsoDateLocal();

  const branchItems = lookups.branches.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  const departmentItems = [
    { value: "none", label: "None" },
    ...lookups.departments.map((item) => ({
      value: item.id,
      label: item.label,
    })),
  ];

  const designationOptions = lookups.designations.map((item) => ({
    value: item.id,
    label: item.label,
  }));

  const employmentTypeItems = [
    { value: "none", label: "None" },
    ...toLookupSelectItems(sortEmploymentTypeOptions(lookups.employmentTypes), {
      showCode: false,
    }),
  ];

  const managerItems = [
    { value: "none", label: "None" },
    ...toEmployeeSelectItems(lookups.managers),
  ];

  const hrApproverItems = [
    { value: "none", label: "None (use organization default)" },
    ...toEmployeeSelectItems(lookups.hrApprovers ?? []),
  ];

  const primaryAddress =
    employee.addresses.find((item) => item.isPrimary) ?? employee.addresses[0];
  const primaryEmergency =
    employee.emergencyContacts.find((item) => item.isPrimary) ??
    employee.emergencyContacts[0];

  const form = useForm<EmployeeUpdateInput>({
    resolver: zodResolver(employeeUpdateSchema),
    defaultValues: {
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone ?? "",
      branchId: employee.branchId,
      departmentId: employee.departmentId ?? "",
      designationId: employee.designationId ?? "",
      customDesignationTitle: "",
      employmentTypeId: employee.employmentTypeId ?? "",
      reportingManagerId: employee.reportingManagerId ?? "",
      assignedHrEmployeeId: employee.assignedHrEmployeeId ?? "",
      employmentStatus: employee.employmentStatus,
      dateOfJoining: employee.dateOfJoining ?? "",
      dateOfLeaving: employee.dateOfLeaving ?? "",
      dateOfBirth: employee.profile?.dateOfBirth ?? "",
      gender: employee.profile?.gender ?? undefined,
      maritalStatus: employee.profile?.maritalStatus ?? undefined,
      nationality: employee.profile?.nationality ?? "",
      bloodGroup: employee.profile?.bloodGroup ?? "",
      personalEmail: employee.profile?.personalEmail ?? "",
      personalPhone: employee.profile?.personalPhone ?? "",
      bio: employee.profile?.bio ?? "",
      addressLine1: primaryAddress?.addressLine1 ?? "",
      addressLine2: primaryAddress?.addressLine2 ?? "",
      city: primaryAddress?.city ?? "",
      state: primaryAddress?.state ?? "",
      postalCode: primaryAddress?.postalCode ?? "",
      country: primaryAddress?.country ?? "",
      emergencyContactName: primaryEmergency?.name ?? "",
      emergencyContactRelationship: primaryEmergency?.relationship ?? "",
      emergencyContactPhone: primaryEmergency?.phone ?? "",
      emergencyContactEmail: primaryEmergency?.email ?? "",
    },
  });

  const designationSelectValue = form.watch("designationId") || "";
  const customDesignationTitle = form.watch("customDesignationTitle") ?? "";
  const employmentTypeId = form.watch("employmentTypeId") || "none";
  const isOtherDesignation = designationSelectValue === DESIGNATION_OTHER_VALUE;
  const genderItems = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
    { value: "other", label: "Other" },
    { value: "prefer_not_to_say", label: "Prefer not to say" },
  ];
  const maritalStatusItems = [
    { value: "single", label: "Single" },
    { value: "married", label: "Married" },
    { value: "divorced", label: "Divorced" },
    { value: "widowed", label: "Widowed" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    if (!onDesignationChange) return;
    if (isOtherDesignation) {
      onDesignationChange(customDesignationTitle.trim() || null);
      return;
    }
    if (!designationSelectValue) {
      onDesignationChange(null);
      return;
    }
    const selected = lookups.designations.find((item) => item.id === designationSelectValue);
    onDesignationChange(selected?.label ?? employee.designationTitle);
  }, [
    customDesignationTitle,
    designationSelectValue,
    employee.designationTitle,
    isOtherDesignation,
    lookups.designations,
    onDesignationChange,
  ]);

  useEffect(() => {
    if (!onEmploymentTypeChange) return;
    if (employmentTypeId === "none" || !employmentTypeId) {
      onEmploymentTypeChange(null);
      return;
    }
    const selected = lookups.employmentTypes.find((item) => item.id === employmentTypeId);
    onEmploymentTypeChange(selected?.label ?? employee.employmentTypeName);
  }, [
    employmentTypeId,
    employee.employmentTypeName,
    lookups.employmentTypes,
    onEmploymentTypeChange,
  ]);

  function setEmploymentTypeId(value: string | null) {
    form.setValue("employmentTypeId", value === "none" ? "" : value ?? "", {
      shouldValidate: true,
      shouldDirty: true,
    });
  }

  function renderEmploymentTypeSelect() {
    return (
      <div className="space-y-2">
        <Label>Employment type</Label>
        <Select
          items={employmentTypeItems}
          value={employmentTypeId}
          onValueChange={setEmploymentTypeId}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select employment type" />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {employmentTypeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  const onSubmit = form.handleSubmit(
    (values) => {
      startTransition(async () => {
        const result = await updateEmployeeAction(employee.id, values);
        if (!result.success) {
          setNotice({
            title: "Could not save employee",
            message: result.message,
          });
          return;
        }

        toast.success("Employee updated successfully");
        if (variant === "inline") {
          onSaved?.();
          router.refresh();
          return;
        }

        router.push(
          routes.detail({
            employeeCode: values.employeeCode,
            firstName: values.firstName,
            lastName: values.lastName,
          }),
        );
        router.refresh();
      });
    },
    (fieldErrors) => {
      setNotice({
        title: "Please review the form",
        message:
          firstFormErrorMessage(fieldErrors) ??
          "Some fields need your attention before saving.",
      });
    },
  );

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="employeeCode">Employee code</Label>
          <Input id="employeeCode" {...form.register("employeeCode")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Company email</Label>
          <Input id="email" type="email" {...form.register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" {...form.register("firstName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" {...form.register("lastName")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <PhoneInput
            id="phone"
            value={form.watch("phone") ?? ""}
            onChange={(value) => form.setValue("phone", value, { shouldValidate: true })}
            disabled={isPending}
            error={form.formState.errors.phone?.message}
          />
        </div>
        <div className="space-y-2">
          <Label>Branch</Label>
          <Select
            items={branchItems}
            value={form.watch("branchId")}
            onValueChange={(value) => form.setValue("branchId", value ?? "")}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {branchItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Department</Label>
          <Select
            items={departmentItems}
            value={form.watch("departmentId") || "none"}
            onValueChange={(value) =>
              form.setValue("departmentId", value === "none" ? "" : value ?? "")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {departmentItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Designation</Label>
          <SearchableSelect
            options={designationOptions}
            value={isOtherDesignation ? DESIGNATION_OTHER_VALUE : designationSelectValue || null}
            createdLabel={isOtherDesignation ? customDesignationTitle : null}
            allowNone
            allowCreate
            placeholder="Search or type a designation…"
            emptyMessage="No matching designations"
            onValueChange={(value) => {
              form.setValue("designationId", value ?? "", { shouldValidate: true, shouldDirty: true });
              form.setValue("customDesignationTitle", "", { shouldDirty: true });
            }}
            onCreate={(label) => {
              form.setValue("designationId", DESIGNATION_OTHER_VALUE, {
                shouldValidate: true,
                shouldDirty: true,
              });
              form.setValue("customDesignationTitle", label, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          />
          {form.formState.errors.customDesignationTitle?.message ? (
            <p className="text-xs text-destructive">
              {form.formState.errors.customDesignationTitle.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Type to search, or enter a new designation and press Enter to save it.
            </p>
          )}
        </div>
        {renderEmploymentTypeSelect()}
        <div className="space-y-2">
          <Label>Reporting manager</Label>
          <Select
            items={managerItems}
            value={form.watch("reportingManagerId") || "none"}
            onValueChange={(value) =>
              form.setValue("reportingManagerId", value === "none" ? "" : value ?? "")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select manager" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {managerItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Assigned HR</Label>
          <Select
            items={hrApproverItems}
            value={form.watch("assignedHrEmployeeId") || "none"}
            onValueChange={(value) =>
              form.setValue("assignedHrEmployeeId", value === "none" ? "" : value ?? "")
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select assigned HR" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {hrApproverItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Primary HR leave approver. Falls back to organization default when empty.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfJoining">Date of joining</Label>
          <Input id="dateOfJoining" type="date" {...form.register("dateOfJoining")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateOfLeaving">Date of leaving</Label>
          <Input id="dateOfLeaving" type="date" {...form.register("dateOfLeaving")} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Address</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input id="addressLine1" {...form.register("addressLine1")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input id="addressLine2" {...form.register("addressLine2")} />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <SearchableSelect
              options={INDIAN_STATES.map((state) => ({ value: state, label: state }))}
              value={form.watch("state") || null}
              onValueChange={(value) => {
                form.setValue("state", value ?? "", { shouldValidate: true });
                form.setValue("city", "");
              }}
              placeholder="Search state…"
              allowNone={false}
            />
          </div>
          <div className="space-y-2">
            <Label>City / District</Label>
            <SearchableSelect
              options={(STATE_DISTRICTS[form.watch("state") || ""] ?? []).map((district) => ({
                value: district,
                label: district,
              }))}
              value={form.watch("city") || null}
              onValueChange={(value) =>
                form.setValue("city", value ?? "", { shouldValidate: true })
              }
              placeholder="Search city…"
              allowNone={false}
              emptyMessage={form.watch("state") ? "No districts found" : "Select a state first"}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input id="postalCode" {...form.register("postalCode")} />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <SearchableSelect
              options={COUNTRIES.map((country) => ({ value: country, label: country }))}
              value={form.watch("country") || null}
              onValueChange={(value) =>
                form.setValue("country", value ?? "", { shouldValidate: true })
              }
              placeholder="Search country…"
              allowNone={false}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold">Emergency contact</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">Contact name</Label>
            <Input id="emergencyContactName" {...form.register("emergencyContactName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactRelationship">Relationship</Label>
            <Input
              id="emergencyContactRelationship"
              {...form.register("emergencyContactRelationship")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">Phone</Label>
            <PhoneInput
              id="emergencyContactPhone"
              value={form.watch("emergencyContactPhone") ?? ""}
              onChange={(value) =>
                form.setValue("emergencyContactPhone", value, { shouldValidate: true })
              }
              disabled={isPending}
              error={form.formState.errors.emergencyContactPhone?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactEmail">Email</Label>
            <Input
              id="emergencyContactEmail"
              type="email"
              {...form.register("emergencyContactEmail")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Profile details</h2>
          <p className="text-sm text-muted-foreground">
            {variant === "inline"
              ? "Personal details shown on the employee overview."
              : "Update personal profile information."}
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {renderEmploymentTypeSelect()}
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              max={maxDateToday}
              {...form.register("dateOfBirth")}
            />
            {form.formState.errors.dateOfBirth?.message ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.dateOfBirth.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Gender *</Label>
            <Select
              items={genderItems}
              value={form.watch("gender") ?? ""}
              onValueChange={(value) =>
                form.setValue(
                  "gender",
                  value as EmployeeUpdateInput["gender"],
                  { shouldValidate: true },
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {genderItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.gender?.message ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.gender.message}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label>Marital status</Label>
            <Select
              items={maritalStatusItems}
              value={form.watch("maritalStatus") ?? ""}
              onValueChange={(value) =>
                form.setValue(
                  "maritalStatus",
                  (value || undefined) as EmployeeUpdateInput["maritalStatus"],
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select marital status" />
              </SelectTrigger>
              <SelectContent align="start" alignItemWithTrigger={false}>
                {maritalStatusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" {...form.register("nationality")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bloodGroup">Blood group</Label>
            <Input id="bloodGroup" {...form.register("bloodGroup")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personalEmail">Personal email</Label>
            <Input id="personalEmail" type="email" {...form.register("personalEmail")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personalPhone">Personal phone</Label>
            <PhoneInput
              id="personalPhone"
              value={form.watch("personalPhone") ?? ""}
              onChange={(value) =>
                form.setValue("personalPhone", value, { shouldValidate: true })
              }
              disabled={isPending}
              error={form.formState.errors.personalPhone?.message}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              rows={4}
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              {...form.register("bio")}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (variant === "inline") {
              onCancel?.();
              return;
            }
            router.push(routes.detail(employee));
          }}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
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
    </>
  );
}
