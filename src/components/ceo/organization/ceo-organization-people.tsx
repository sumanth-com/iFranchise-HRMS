"use client";

import { Users } from "lucide-react";

import { Button } from "@/components/common/button";
import {
  EmployeeDirectoryGrid,
  type DirectoryCardPerson,
} from "@/components/employee/directory/employee-directory-card";
import type { CeoOrgDirectoryItem } from "@/types/ceo-organization";

type CeoOrganizationPeopleProps = {
  employees: CeoOrgDirectoryItem[];
  total: number;
  page: number;
  pageSize: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onView: (employeeId: string) => void;
};

function toDirectoryCardPerson(person: CeoOrgDirectoryItem): DirectoryCardPerson {
  return {
    id: person.id,
    employeeCode: person.employeeCode,
    firstName: person.firstName,
    lastName: person.lastName,
    fullName: person.fullName,
    email: person.email,
    phone: person.phone,
    designationTitle: person.designationTitle,
    departmentName: person.departmentName,
    dateOfJoining: person.dateOfJoining,
    experienceYears: person.experienceYears,
    avatarUrl: null,
    profileImagePath: person.profileImagePath,
    managerName: person.managerName,
  };
}

export function CeoOrganizationPeople({
  employees,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onView,
}: CeoOrganizationPeopleProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const people = employees.map(toDirectoryCardPerson);

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-2">
          <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">People</h2>
            <p className="text-xs text-muted-foreground">
              Browse colleagues across the organization — expand a card for details.
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
          {total} {total === 1 ? "person" : "people"}
        </span>
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Loading people…</p>
      ) : people.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-background px-6 py-16 text-center">
          <Users className="size-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium">No people match the current filters</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try adjusting department, manager, or search filters.
          </p>
        </div>
      ) : (
        <EmployeeDirectoryGrid people={people} onViewProfile={onView} />
      )}

      {total > pageSize ? (
        <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Showing {employees.length} of {total} people
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
      ) : null}
    </section>
  );
}
