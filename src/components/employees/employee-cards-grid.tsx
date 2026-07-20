"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/common/button";
import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSignedUrlAction } from "@/lib/employees/actions";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/types/employee";

const CARD_HEIGHT = "h-[21.5rem]";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function CardPhoto({ employee }: { employee: EmployeeListItem }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const label = initials(employee.firstName, employee.lastName);

  useEffect(() => {
    if (!employee.profileImagePath) {
      setImageUrl(null);
      return;
    }

    let cancelled = false;
    void getSignedUrlAction("profileImages", employee.profileImagePath).then((result) => {
      if (!cancelled && result.success) {
        setImageUrl(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [employee.profileImagePath]);

  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
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

type EmployeeCardsGridProps = {
  employees: EmployeeListItem[];
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (employee: EmployeeListItem) => void;
};

export function EmployeeCardsGrid({
  employees,
  canEdit,
  canDelete,
  onDelete,
}: EmployeeCardsGridProps) {
  const router = useRouter();

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
        No employees found.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {employees.map((employee) => {
        const routeIdentity = {
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
        };
        const detailHref = EMPLOYEE_ROUTES.detail(routeIdentity);
        const editHref = EMPLOYEE_ROUTES.edit(routeIdentity);

        return (
          <article
            key={employee.id}
            className={cn(
              CARD_HEIGHT,
              "group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
            )}
          >
            <button
              type="button"
              className="flex h-full w-full flex-col text-left"
              onClick={() => router.push(detailHref)}
            >
              <div className="relative h-[11.5rem] w-full shrink-0 bg-muted">
                <CardPhoto employee={employee} />
                <div className="absolute left-3 top-3">
                  <EmploymentStatusBadge status={employee.employmentStatus} />
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-center px-4 text-center">
                <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight">
                  {employee.fullName}
                </h3>
                <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">
                  {employee.designationTitle || "Team Member"}
                  <span className="mx-1.5 text-muted-foreground/40">·</span>
                  <span className="font-mono text-[11px] font-medium">
                    {employee.employeeCode}
                  </span>
                </p>
              </div>
            </button>

            <div
              className="absolute right-2 top-2 z-10"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      className="size-8 bg-background/90 shadow-sm backdrop-blur"
                      aria-label="Open actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(detailHref)}>
                    <Eye className="size-4" />
                    View
                  </DropdownMenuItem>
                  {canEdit ? (
                    <DropdownMenuItem onClick={() => router.push(editHref)}>
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      onClick={() => onDelete(employee)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </article>
        );
      })}
    </div>
  );
}
