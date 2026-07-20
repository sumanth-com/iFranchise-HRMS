"use client";

import Link from "next/link";

import { DOCUMENTS_ROUTES } from "@/lib/documents/constants";
import { cn } from "@/lib/utils";
import type { DocumentEmployeeCard } from "@/types/documents";

const CARD_HEIGHT = "h-[21.5rem]";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function CardPhoto({ employee }: { employee: DocumentEmployeeCard }) {
  const label = initials(employee.firstName, employee.lastName);

  if (employee.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={employee.avatarUrl}
        alt={employee.fullName}
        className="h-full w-full object-cover object-top"
      />
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/15">
      <span className="text-3xl font-semibold tracking-wide text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}

export function HrEmployeeDocumentCards({ employees }: { employees: DocumentEmployeeCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {employees.map((employee) => (
        <Link
          key={employee.id}
          href={DOCUMENTS_ROUTES.employeeDocument(employee.id)}
          className={cn(
            CARD_HEIGHT,
            "group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm",
            "transition-shadow hover:shadow-md",
          )}
        >
          <div className="relative h-[11.5rem] w-full shrink-0 bg-muted">
            <CardPhoto employee={employee} />
          </div>

          <div className="flex flex-1 flex-col justify-center px-4 text-center">
            <h2 className="line-clamp-1 text-[15px] font-semibold tracking-tight">
              {employee.fullName}
            </h2>
            <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">
              {employee.designationTitle || "Team Member"}
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <span className="font-mono text-[11px] font-medium">{employee.employeeCode}</span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
