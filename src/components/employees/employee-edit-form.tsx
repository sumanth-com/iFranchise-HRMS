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
    },
  });

  const designationSelectValue = form.watch("designationId") || "none";
  const isOtherDesignation = designationSelectValue === DESIGNATION_OTHER_VALUE;

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
