"use client";

import { format } from "date-fns";
import { Eye, Mail, MoreVertical, Phone, Users } from "lucide-react";

import { Button } from "@/components/common/button";
import { EmployeeAvatar } from "@/components/employees/employee-avatar";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{value}</span>
    </div>
  );
}

function PersonCard({
  person,
  onView,
}: {
  person: CeoOrgDirectoryItem;
  onView: (employeeId: string) => void;
}) {
  return (
    <article className="relative flex flex-col rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/30">
      <div className="absolute right-2 top-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                aria-label="Employee actions"
              >
                <MoreVertical className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem onClick={() => onView(person.id)}>
              <Eye className="mr-2 size-4" />
              View profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <button
        type="button"
        onClick={() => onView(person.id)}
        className="flex flex-col items-center text-center"
      >
        <EmployeeAvatar
          firstName={person.firstName}
          lastName={person.lastName}
          profileImagePath={person.profileImagePath}
          className="size-16"
        />
        <p className="mt-2 line-clamp-1 font-semibold hover:text-primary">
          {person.fullName}
        </p>
        <p className="line-clamp-1 text-xs text-muted-foreground">
          {person.designationTitle ?? "—"}
        </p>
      </button>

      <div className="mt-2 flex justify-center">
        <EmploymentStatusBadge status={person.employmentStatus} />
      </div>

      <div className="mt-3 space-y-1.5 border-t pt-3 text-xs">
        <div className="flex items-center gap-2">
          <Mail className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{person.email}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate">{person.phone ?? "—"}</span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 border-t pt-3 text-xs">
        <MetaRow label="Department" value={person.departmentName ?? "—"} />
        <MetaRow label="Reporting to" value={person.managerName ?? "—"} />
        <MetaRow
          label="Joined"
          value={
            person.dateOfJoining
              ? format(new Date(person.dateOfJoining), "d MMM yyyy")
              : "—"
          }
        />
      </div>
    </article>
  );
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

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold">People</h2>
          <p className="text-xs text-muted-foreground">
            Employees matching the selected filters · click a card to view the profile.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading people…</p>
      ) : employees.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No people match the current filters.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((person) => (
            <PersonCard key={person.id} person={person} onView={onView} />
          ))}
        </div>
      )}

      {total > pageSize ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3">
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
