"use client";

import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import { cn } from "@/lib/utils";
import type { ManagerProfileCardData } from "@/types/manager-self-attendance";

type Props = {
  profile: ManagerProfileCardData;
  className?: string;
};

/** Display-only digital ID using the same HR portal card look. */
export function ManagerProfileIdCard({ profile, className }: Props) {
  return (
    <EmployeeIdCard
      employeeId={profile.employeeId}
      firstName={profile.firstName}
      lastName={profile.lastName}
      employeeCode={profile.employeeCode}
      designation={profile.designation}
      departmentName={profile.departmentName}
      employmentTypeName={profile.employmentTypeName}
      accountStatus={profile.accountStatus}
      imageUrl={profile.imageUrl}
      profilePath={profile.profilePath}
      canEdit={false}
      className={cn("mx-auto h-full min-h-[28rem] max-w-[18.5rem] xl:mx-0", className)}
    />
  );
}
