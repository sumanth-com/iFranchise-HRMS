"use client";

import { Search, X } from "lucide-react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { LabeledSelect } from "@/components/payroll/payroll-select";
import { toLookupSelectItems } from "@/components/payroll/select-utils";
import { Label } from "@/components/ui/label";
import type {
  CeoProvisioningListParams,
  CeoProvisioningLookups,
} from "@/types/ceo-user-provisioning";

type CeoProvisioningFiltersProps = {
  filters: CeoProvisioningListParams;
  lookups: CeoProvisioningLookups;
  disabled?: boolean;
  onChange: (next: CeoProvisioningListParams) => void;
};

const EMPTY_FILTER = "";

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function CeoProvisioningFilters({
  filters,
  lookups,
  disabled,
  onChange,
}: CeoProvisioningFiltersProps) {
  const roleItems = lookups.roles.map((role) => ({
    value: role.code,
    label: role.name,
  }));

  function update(patch: Partial<CeoProvisioningListParams>) {
    onChange({ ...filters, page: 1, ...patch });
  }

  function clearFilters() {
    onChange({
      page: 1,
      pageSize: filters.pageSize,
    });
  }

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.roleCode ||
      filters.departmentId ||
      filters.branchId ||
      filters.portalKey ||
      filters.employmentTypeId ||
      filters.invitationStatus,
  );

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <FilterField label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filters.search ?? ""}
                onChange={(event) => update({ search: event.target.value || undefined })}
                placeholder="Name, email, employee ID, department, role…"
                className="h-10 pl-9"
                disabled={disabled}
              />
            </div>
          </FilterField>
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <FilterField label="Portal">
            <LabeledSelect
              value={filters.portalKey ?? EMPTY_FILTER}
              placeholder="All portals"
              items={[
                { value: EMPTY_FILTER, label: "All portals" },
                ...toLookupSelectItems(lookups.portals),
              ]}
              onValueChange={(value) =>
                update({
                  portalKey: value
                    ? (value as CeoProvisioningListParams["portalKey"])
                    : undefined,
                })
              }
              disabled={disabled}
            />
          </FilterField>
          <FilterField label="Role">
            <LabeledSelect
              value={filters.roleCode ?? EMPTY_FILTER}
              placeholder="All roles"
              items={[{ value: EMPTY_FILTER, label: "All roles" }, ...roleItems]}
              onValueChange={(value) => update({ roleCode: value || undefined })}
              disabled={disabled}
            />
          </FilterField>
          <FilterField label="Department">
            <LabeledSelect
              value={filters.departmentId ?? EMPTY_FILTER}
              placeholder="All departments"
              items={[
                { value: EMPTY_FILTER, label: "All departments" },
                ...toLookupSelectItems(lookups.departments),
              ]}
              onValueChange={(value) => update({ departmentId: value || undefined })}
              disabled={disabled}
            />
          </FilterField>
          <FilterField label="Status">
            <LabeledSelect
              value={filters.invitationStatus ?? EMPTY_FILTER}
              placeholder="All statuses"
              items={[
                { value: EMPTY_FILTER, label: "All statuses" },
                ...toLookupSelectItems(lookups.statuses),
              ]}
              onValueChange={(value) =>
                update({
                  invitationStatus: value
                    ? (value as CeoProvisioningListParams["invitationStatus"])
                    : undefined,
                })
              }
              disabled={disabled}
            />
          </FilterField>
          <FilterField label="Branch">
            <LabeledSelect
              value={filters.branchId ?? EMPTY_FILTER}
              placeholder="All branches"
              items={[
                { value: EMPTY_FILTER, label: "All branches" },
                ...toLookupSelectItems(lookups.branches),
              ]}
              onValueChange={(value) => update({ branchId: value || undefined })}
              disabled={disabled}
            />
          </FilterField>
          <FilterField label="Employment Type">
            <LabeledSelect
              value={filters.employmentTypeId ?? EMPTY_FILTER}
              placeholder="All types"
              items={[
                { value: EMPTY_FILTER, label: "All types" },
                ...toLookupSelectItems(lookups.employmentTypes),
              ]}
              onValueChange={(value) => update({ employmentTypeId: value || undefined })}
              disabled={disabled}
            />
          </FilterField>
        </div>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={clearFilters}
            disabled={disabled}
          >
            <X className="size-4" />
            Clear
          </Button>
        ) : null}
      </div>
    </section>
  );
}
