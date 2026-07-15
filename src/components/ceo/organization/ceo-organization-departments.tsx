"use client";

import { Users } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";
import type { CeoOrgDepartmentCard } from "@/types/ceo-organization";

type CeoOrganizationDepartmentsProps = {
  departments: CeoOrgDepartmentCard[];
  selectedDepartmentId?: string;
  onSelect: (departmentId: string | undefined) => void;
};

export function CeoOrganizationDepartments({
  departments,
  selectedDepartmentId,
  onSelect,
}: CeoOrganizationDepartmentsProps) {
  if (departments.length === 0) {
    return (
      <EmptyState
        title="No departments"
        description="Departments will appear here once organization structure is set up."
      />
    );
  }

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Departments</h2>
          <p className="text-xs text-muted-foreground">
            Click a department to filter the directory.
          </p>
        </div>
        {selectedDepartmentId ? (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => onSelect(undefined)}
          >
            Clear selection
          </button>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {departments.map((department) => {
          const isSelected = selectedDepartmentId === department.id;
          return (
            <button
              key={department.id}
              type="button"
              onClick={() => onSelect(isSelected ? undefined : department.id)}
              className={cn(
                "rounded-xl border bg-background/80 p-4 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.02]",
                isSelected && "border-primary bg-primary/[0.04] ring-1 ring-primary/20",
              )}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
                  <Users className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{department.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Head · {department.headName ?? "Unassigned"}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Employees</p>
                  <p className="font-semibold tabular-nums">{department.employeeCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Managers</p>
                  <p className="font-semibold tabular-nums">{department.managerCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Attendance</p>
                  <p className="font-semibold tabular-nums">{department.attendancePercent}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Performance</p>
                  <p className="font-semibold tabular-nums">
                    {department.performanceScore != null
                      ? department.performanceScore.toFixed(1)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Open Roles</p>
                  <p className="font-semibold tabular-nums">{department.openPositions}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Experience</p>
                  <p className="font-semibold tabular-nums">
                    {department.averageExperienceYears != null
                      ? `${department.averageExperienceYears} yr`
                      : "—"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
