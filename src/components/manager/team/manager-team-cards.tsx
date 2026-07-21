"use client";

import { differenceInMonths } from "date-fns";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  EmployeeDirectoryGrid,
  type DirectoryCardPerson,
} from "@/components/employee/directory/employee-directory-card";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import type { TeamMemberListItem } from "@/types/manager-team";

type ManagerTeamCardsProps = {
  employees: TeamMemberListItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
};

function experienceYearsFromJoining(dateOfJoining: string | null): number | null {
  if (!dateOfJoining) return null;
  const months = differenceInMonths(new Date(), new Date(dateOfJoining));
  if (months < 0) return 0;
  return Math.round((months / 12) * 10) / 10;
}

function toDirectoryCardPerson(member: TeamMemberListItem): DirectoryCardPerson {
  return {
    id: member.id,
    employeeCode: member.employeeCode,
    firstName: member.firstName,
    lastName: member.lastName,
    fullName: member.fullName,
    email: member.email,
    phone: member.phone,
    designationTitle: member.designationTitle,
    departmentName: member.departmentName,
    dateOfJoining: member.dateOfJoining,
    experienceYears: experienceYearsFromJoining(member.dateOfJoining),
    avatarUrl: null,
    profileImagePath: member.profileImagePath,
    managerName: member.managerName,
  };
}

export function ManagerTeamCards({
  employees,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
}: ManagerTeamCardsProps) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const people = employees.map(toDirectoryCardPerson);

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading team members…</p>
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-background px-6 py-16 text-center">
          <Users className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No team members found</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting search or filters, or check back when reports are assigned.
          </p>
        </div>
      ) : (
        <EmployeeDirectoryGrid
          people={people}
          directProfileLink
          onViewProfile={(employeeId) => {
            const member = employees.find((row) => row.id === employeeId);
            if (member) {
              router.push(MANAGER_ROUTES.teamMember(member.employeeCode));
            }
          }}
        />
      )}

      {total > pageSize ? (
        <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {employees.length} of {total} team member{total === 1 ? "" : "s"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
          Showing {employees.length} of {total} team member{total === 1 ? "" : "s"}
        </p>
      )}
    </section>
  );
}
