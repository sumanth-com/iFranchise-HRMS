"use client";

import { useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";

import { EmployeeDirectoryGrid } from "@/components/employee/directory/employee-directory-card";
import { Input } from "@/components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/select";
import type { LookupOption } from "@/types/employee";
import type { EmployeeDirectoryPerson } from "@/types/employee-directory";

const ALL_DEPARTMENTS = "__all_departments__";

type EmployeeDirectoryViewProps = {
  people: EmployeeDirectoryPerson[];
  departments?: LookupOption[];
};

export function EmployeeDirectoryView({ people, departments = [] }: EmployeeDirectoryViewProps) {
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState(ALL_DEPARTMENTS);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => {
      if (departmentId !== ALL_DEPARTMENTS && person.departmentId !== departmentId) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        person.fullName,
        person.employeeCode,
        person.designationTitle,
        person.departmentName,
        person.verticalName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [people, query, departmentId]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Employee Directory</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse colleagues by department and team. Personal contact details are not shown.
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:min-w-0 sm:items-end">
              <div className="flex w-full items-center gap-3 sm:w-auto">
                {departments.length > 0 ? (
                  <Select
                  value={departmentId}
                  onValueChange={(value) => {
                    if (value) setDepartmentId(value);
                  }}
                >
                    <SelectTrigger className="h-10 w-full min-w-[11rem] sm:w-44">
                      <SelectValue placeholder="All departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_DEPARTMENTS}>All departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <div className="relative w-full min-w-[12rem] sm:w-72 md:w-80">
                  <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search name, ID, department"
                    className="h-10 w-full rounded-lg border-muted-foreground/15 bg-muted/25 pr-10 pl-10 shadow-none"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute top-1/2 right-3 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "employee" : "employees"}
              </span>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
            <Users className="size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium">No employees found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a different search or department filter.
            </p>
          </div>
        ) : (
          <EmployeeDirectoryGrid people={filtered} />
        )}
      </div>
    </div>
  );
}
