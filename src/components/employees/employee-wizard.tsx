"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
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
import {
  createEmployeeAction,
  getEmployeeCodeSuggestionAction,
  uploadWizardDocumentAction,
} from "@/lib/employees/actions";
import {
  EMPLOYEE_ROUTES,
  EMPLOYMENT_STATUS_LABELS,
  WIZARD_STEPS,
} from "@/lib/employees/constants";
import {
  employeeAddressStepSchema,
  employeeBasicStepSchema,
  employeeEmergencyContactStepSchema,
  employeeEmploymentStepSchema,
  employeeWizardSchema,
  type EmployeeWizardInputValidated,
} from "@/lib/validations/employee";
import type { LookupOption } from "@/types/employee";
import { cn } from "@/lib/utils";

type EmployeeWizardProps = {
  lookups: {
    branches: LookupOption[];
    departments: LookupOption[];
    designations: LookupOption[];
    employmentTypes: LookupOption[];
    managers: LookupOption[];
    documentTypes: LookupOption[];
  };
};

type WizardDocument = EmployeeWizardInputValidated["documents"][number] & {
  id: string;
};

export function EmployeeWizard({ lookups }: EmployeeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [documents, setDocuments] = useState<WizardDocument[]>([]);

  const basicForm = useForm({
    resolver: zodResolver(employeeBasicStepSchema),
    defaultValues: {
      employeeCode: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      nationality: "",
      bloodGroup: "",
      personalEmail: "",
      personalPhone: "",
      bio: "",
    },
  });

  const employmentForm = useForm({
    resolver: zodResolver(employeeEmploymentStepSchema),
    defaultValues: {
      branchId: lookups.branches[0]?.id ?? "",
      departmentId: "",
      designationId: "",
      employmentTypeId: "",
      reportingManagerId: "",
      employmentStatus: "draft" as const,
      dateOfJoining: "",
      dateOfLeaving: "",
    },
  });

  const addressForm = useForm({
    resolver: zodResolver(employeeAddressStepSchema),
    defaultValues: {
      addressType: "current" as const,
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "IN",
      isPrimary: true,
    },
  });

  const emergencyForm = useForm({
    resolver: zodResolver(employeeEmergencyContactStepSchema),
    defaultValues: {
      name: "",
      relationship: "",
      phone: "",
      email: "",
      isPrimary: true,
    },
  });

  useEffect(() => {
    void getEmployeeCodeSuggestionAction().then((result) => {
      if (result.success) {
        basicForm.setValue("employeeCode", result.data);
      }
    });
  }, [basicForm]);

  const goNext = async () => {
    if (step === 1) {
      const valid = await basicForm.trigger();
      if (!valid) return;
    }
    if (step === 2) {
      const valid = await employmentForm.trigger();
      if (!valid) return;
    }
    if (step === 3) {
      const valid = await addressForm.trigger();
      if (!valid) return;
    }
    if (step === 4) {
      const valid = await emergencyForm.trigger();
      if (!valid) return;
    }
    setStep((current) => Math.min(current + 1, WIZARD_STEPS.length));
  };

  const handleSubmit = () => {
    const payload = {
      basic: basicForm.getValues(),
      employment: employmentForm.getValues(),
      address: addressForm.getValues(),
      emergencyContact: emergencyForm.getValues(),
      documents,
    };

    const parsed = employeeWizardSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error("Please review all steps before submitting.");
      return;
    }

    startTransition(async () => {
      const result = await createEmployeeAction(parsed.data);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success("Employee created successfully");
      router.push(EMPLOYEE_ROUTES.detail(result.data));
      router.refresh();
    });
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    title: string,
    documentTypeId: string,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);

    const result = await uploadWizardDocumentAction(formData);
    if (!result.success) {
      toast.error(result.message);
      return;
    }

    setDocuments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        title,
        documentTypeId,
        fileName: result.data.fileName,
        mimeType: result.data.mimeType,
        fileSizeBytes: result.data.fileSizeBytes,
        storagePath: result.data.storagePath,
      },
    ]);

    toast.success("Document uploaded");
    event.target.value = "";
  };

  const review = {
    basic: basicForm.watch(),
    employment: employmentForm.watch(),
    address: addressForm.watch(),
    emergencyContact: emergencyForm.watch(),
  };

  return (
    <div className="space-y-6">
      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {WIZARD_STEPS.map((wizardStep) => (
          <li
            key={wizardStep.id}
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              step === wizardStep.id
                ? "border-primary bg-primary/5 font-medium"
                : "text-muted-foreground",
            )}
          >
            <span className="block text-xs uppercase tracking-wide">
              Step {wizardStep.id}
            </span>
            {wizardStep.label}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="employeeCode">Employee code</Label>
            <Input id="employeeCode" {...basicForm.register("employeeCode")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Company email</Label>
            <Input id="email" type="email" {...basicForm.register("email")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...basicForm.register("firstName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...basicForm.register("lastName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...basicForm.register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" type="date" {...basicForm.register("dateOfBirth")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personalEmail">Personal email</Label>
            <Input id="personalEmail" type="email" {...basicForm.register("personalEmail")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" {...basicForm.register("nationality")} />
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select
              value={employmentForm.watch("branchId")}
              onValueChange={(value) => employmentForm.setValue("branchId", value ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {lookups.branches.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Department</Label>
            <Select
              value={employmentForm.watch("departmentId") || "none"}
              onValueChange={(value) =>
                employmentForm.setValue("departmentId", value === "none" ? "" : value ?? "")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {lookups.departments.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            <Select
              value={employmentForm.watch("designationId") || "none"}
              onValueChange={(value) =>
                employmentForm.setValue("designationId", value === "none" ? "" : value ?? "")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {lookups.designations.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Employment type</Label>
            <Select
              value={employmentForm.watch("employmentTypeId") || "none"}
              onValueChange={(value) =>
                employmentForm.setValue("employmentTypeId", value === "none" ? "" : value ?? "")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {lookups.employmentTypes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reporting manager</Label>
            <Select
              value={employmentForm.watch("reportingManagerId") || "none"}
              onValueChange={(value) =>
                employmentForm.setValue(
                  "reportingManagerId",
                  value === "none" ? "" : value ?? "",
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {lookups.managers.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Employment status</Label>
            <Select
              value={employmentForm.watch("employmentStatus")}
              onValueChange={(value) =>
                employmentForm.setValue(
                  "employmentStatus",
                  (value ?? "draft") as EmployeeWizardInputValidated["employment"]["employmentStatus"],
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dateOfJoining">Date of joining</Label>
            <Input id="dateOfJoining" type="date" {...employmentForm.register("dateOfJoining")} />
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input id="addressLine1" {...addressForm.register("addressLine1")} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input id="addressLine2" {...addressForm.register("addressLine2")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" {...addressForm.register("city")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input id="state" {...addressForm.register("state")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postalCode">Postal code</Label>
            <Input id="postalCode" {...addressForm.register("postalCode")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...addressForm.register("country")} />
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contactName">Contact name</Label>
            <Input id="contactName" {...emergencyForm.register("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship</Label>
            <Input id="relationship" {...emergencyForm.register("relationship")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactPhone">Phone</Label>
            <Input id="contactPhone" {...emergencyForm.register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" {...emergencyForm.register("email")} />
          </div>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="space-y-4">
          {lookups.documentTypes.map((documentType) => (
            <div
              key={documentType.id}
              className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{documentType.label}</p>
                <p className="text-sm text-muted-foreground">{documentType.code}</p>
              </div>
              <Input
                type="file"
                onChange={(event) =>
                  void handleDocumentUpload(
                    event,
                    documentType.label,
                    documentType.id,
                  )
                }
              />
            </div>
          ))}
          {documents.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {documents.map((document) => (
                <li key={document.id} className="rounded-md border px-3 py-2">
                  {document.title} — {document.fileName}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {step === 6 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ReviewCard title="Basic details" items={[
            ["Code", review.basic.employeeCode],
            ["Name", `${review.basic.firstName} ${review.basic.lastName}`],
            ["Email", review.basic.email],
            ["Phone", review.basic.phone || "—"],
          ]} />
          <ReviewCard title="Employment" items={[
            ["Branch", lookups.branches.find((b) => b.id === review.employment.branchId)?.label ?? "—"],
            ["Department", lookups.departments.find((d) => d.id === review.employment.departmentId)?.label ?? "—"],
            ["Status", EMPLOYMENT_STATUS_LABELS[review.employment.employmentStatus]],
          ]} />
          <ReviewCard title="Address" items={[
            [review.address.addressLine1, review.address.city],
            [review.address.state || "—", review.address.country || "—"],
          ]} />
          <ReviewCard title="Emergency contact" items={[
            [review.emergencyContact.name, review.emergencyContact.relationship],
            [review.emergencyContact.phone, review.emergencyContact.email || "—"],
          ]} />
          <ReviewCard title="Documents" items={[
            [`${documents.length} file(s) attached`, ""],
          ]} />
        </div>
      ) : null}

      <div className="flex items-center justify-between border-t pt-4">
        <Button
          type="button"
          variant="outline"
          disabled={step === 1 || isPending}
          onClick={() => setStep((current) => Math.max(current - 1, 1))}
        >
          Back
        </Button>
        {step < WIZARD_STEPS.length ? (
          <Button type="button" onClick={() => void goNext()} disabled={isPending}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Creating..." : "Create employee"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewCard({
  title,
  items,
}: {
  title: string;
  items: [string, string][];
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-medium">{title}</h3>
      <dl className="space-y-2 text-sm">
        {items.map(([left, right], index) => (
          <div key={`${left}-${index}`} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{left}</dt>
            <dd className="text-right font-medium">{right}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
