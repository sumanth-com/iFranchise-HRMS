import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { buttonVariants } from "@/components/common/button";
import { getEmployeeDetailBundleAction } from "@/lib/employees/actions";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { buildEmployeeRouteRef, isEmployeeUuid } from "@/lib/employees/routing";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

type EmployeeScanPageProps = {
  params: Promise<{ employeeRef: string }>;
};

export default async function EmployeeScanPage({ params }: EmployeeScanPageProps) {
  const { employeeRef } = await params;
  const bundle = await getEmployeeDetailBundleAction(employeeRef);

  if (!bundle) {
    notFound();
  }

  const canonicalRef = buildEmployeeRouteRef(bundle.employee);

  if (employeeRef !== canonicalRef || isEmployeeUuid(employeeRef)) {
    redirect(`/e/${canonicalRef}`);
  }

  const { employee, profileImageUrl } = bundle;
  const fullName = `${employee.firstName} ${employee.lastName}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#f7f4ff] via-white to-[#ebe4ff] px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-black/5 bg-white shadow-[0_20px_50px_-20px_rgba(79,70,229,0.35)]">
        <div className="bg-gradient-to-br from-[#7b5cff] to-[#4b3f8f] px-6 pb-10 pt-8 text-white">
          <p className="text-[0.7rem] font-medium tracking-[0.16em] text-white/75 uppercase">
            {siteConfig.name}
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Meet {employee.firstName}</h1>
          <p className="mt-2 text-sm text-white/85">
            Growing with purpose on the {employee.departmentName ?? "organization"} team.
          </p>
        </div>

        <div className="relative -mt-8 px-6 pb-6">
          <div className="mx-auto flex size-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-muted shadow-md">
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt={fullName}
                className="size-full object-cover"
              />
            ) : (
              <EmployeeAvatar
                firstName={employee.firstName}
                lastName={employee.lastName}
                signedUrl={null}
                className="size-full text-2xl"
              />
            )}
          </div>

          <div className="mt-4 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{fullName}</h2>
              <EmploymentStatusBadge status={employee.employmentStatus} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {employee.designationTitle ?? "Team Member"}
            </p>
            <p className="mt-2 font-mono text-xs font-semibold tracking-wide text-neutral-500">
              ID · {employee.employeeCode}
            </p>
          </div>

          <div className="mt-6 space-y-3 rounded-2xl border bg-card p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium text-right">{employee.departmentName ?? "—"}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <a href={`mailto:${employee.email}`} className="font-medium text-primary text-right break-all">
                {employee.email}
              </a>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Phone</span>
              <span className="font-medium text-right">{employee.phone ?? "—"}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              href={EMPLOYEE_ROUTES.detail(employee)}
              className={cn(buttonVariants(), "w-full")}
            >
              Open full profile
            </Link>
            <Link
              href={EMPLOYEE_ROUTES.list}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Back to employees
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
