"use client";

import { EmployeeIdCard } from "@/components/employees/employee-id-card";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { cn } from "@/lib/utils";
import type { CeoExecutiveProfile } from "@/types/ceo-profile";

type Props = {
  profile: CeoExecutiveProfile;
  className?: string;
};

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Executive", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return {
    firstName: parts[0]!,
    lastName: parts.slice(1).join(" "),
  };
}

/** Display-only digital ID using the same HR / Manager portal card look. */
export function CeoProfileIdCard({ profile, className }: Props) {
  const { firstName, lastName } = splitName(profile.fullName);

  return (
    <EmployeeIdCard
      employeeId={profile.employeeId}
      firstName={firstName}
      lastName={lastName}
      employeeCode={profile.employeeCode}
      designation={profile.roleName}
      departmentName={profile.departmentName}
      employmentTypeName={profile.employmentTypeName ?? "Full Time"}
      accountStatus="active"
      imageUrl={profile.profileImageUrl}
      profilePath={CEO_ROUTES.profile}
      canEdit={false}
      className={cn(
        "mx-auto h-full min-h-[28rem] max-w-[18.5rem] xl:mx-0",
        className,
      )}
    />
  );
}
