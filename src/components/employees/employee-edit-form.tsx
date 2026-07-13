"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import { updateEmployeeAction } from "@/lib/employees/actions";
import {
  DESIGNATION_OTHER_VALUE,
  EMPLOYEE_ROUTES,
  EMPLOYMENT_STATUS_LABELS,
} from "@/lib/employees/constants";
import {
  employeeUpdateSchema,
  type EmployeeUpdateInput,
} from "@/lib/validations/employee";
import type { EmployeeDetail, LookupOption } from "@/types/employee";

type EmployeeEditFormProps = {
  employee: EmployeeDetail;
  lookups: {
    branches: LookupOption[];
    departments: LookupOption[];
    designations: LookupOption[];
    employmentTypes: LookupOption[];
    managers: LookupOption[];
  };
};

export function EmployeeEditForm({ employee, lookups }: EmployeeEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  const designationItems = [
    { value: "none", label: "None" },
    ...lookups.designations.map((item) => ({
      value: item.id,
      label: item.label,
    })),
    { value: DESIGNATION_OTHER_VALUE, label: "Others" },
  ];

  const employmentStatusItems = Object.entries(EMPLOYMENT_STATUS_LABELS).map(
    ([value, label]) => ({ value, label }),
  );

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
    },
  });

  const designationSelectValue = form.watch("designationId") || "none";
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

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateEmployeeAction(employee.id, values);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Employee updated successfully");
      router.push(
        EMPLOYEE_ROUTES.detail({
          employeeCode: values.employeeCode,
          firstName: values.firstName,
          lastName: values.lastName,
        }),
      );
      router.refresh();
    });
  });

  return (
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
          <Input id="phone" {...form.register("phone")} />
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
          <Select
            items={designationItems}
            value={designationSelectValue}
            onValueChange={(value) => {
              if (value === "none") {
                form.setValue("designationId", "");
                form.setValue("customDesignationTitle", "");
                return;
              }

              if (value === DESIGNATION_OTHER_VALUE) {
                form.setValue("designationId", DESIGNATION_OTHER_VALUE);
                return;
              }

              form.setValue("designationId", value ?? "");
              form.setValue("customDesignationTitle", "");
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select designation" />
            </SelectTrigger>
            <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
              {designationItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOtherDesignation ? (
            <Input
              id="customDesignationTitle"
              placeholder="Enter designation"
              {...form.register("customDesignationTitle")}
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <Label>Employment status</Label>
          <Select
            items={employmentStatusItems}
            value={form.watch("employmentStatus")}
            onValueChange={(value) =>
              form.setValue(
                "employmentStatus",
                (value ?? employee.employmentStatus) as EmployeeUpdateInput["employmentStatus"],
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent align="start" alignItemWithTrigger={false}>
              {employmentStatusItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        <div>
          <h2 className="text-base font-semibold">Profile details</h2>
          <p className="text-sm text-muted-foreground">
            Update personal profile information shown on the Profile tab.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select
              items={genderItems}
              value={form.watch("gender") ?? ""}
              onValueChange={(value) =>
                form.setValue(
                  "gender",
                  (value || undefined) as EmployeeUpdateInput["gender"],
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
            <Input id="personalPhone" {...form.register("personalPhone")} />
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
          onClick={() => router.push(EMPLOYEE_ROUTES.detail(employee))}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
