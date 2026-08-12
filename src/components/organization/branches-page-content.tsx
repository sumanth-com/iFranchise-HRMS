"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { BranchesManagement } from "@/components/organization/branches-management";
import { WorkLocationsManagement } from "@/components/organization/work-locations-management";
import type { LookupOption } from "@/types/employee";
import type {
  BranchListResult,
  WorkLocationListResult,
} from "@/types/organization";
import type { RecordStatus } from "@/types/auth";

type Props = {
  branchesResult: BranchListResult;
  workLocationsResult: WorkLocationListResult;
  employees: LookupOption[];
  branchLookups: LookupOption[];
  permissionCodes: string[];
  branchSearch: string;
  branchStatus?: RecordStatus;
  workLocationSearch: string;
  workLocationStatus?: RecordStatus;
};

export function BranchesPageContent({
  branchesResult,
  workLocationsResult,
  employees,
  branchLookups,
  permissionCodes,
  branchSearch,
  branchStatus,
  workLocationSearch,
  workLocationStatus,
}: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Branches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage company branches, offices, and work locations.
        </p>
      </div>

      <BranchesManagement
        result={branchesResult}
        employees={employees}
        permissionCodes={permissionCodes}
        search={branchSearch}
        status={branchStatus}
        embedded
        sectionScrollable
      />

      <section id="work-locations" className="scroll-mt-6">
        <WorkLocationsManagement
          result={workLocationsResult}
          branches={branchLookups}
          permissionCodes={permissionCodes}
          search={workLocationSearch}
          status={workLocationStatus}
          embedded
          sectionScrollable
          pageParam="wlPage"
          searchParam="wlSearch"
          statusParam="wlStatus"
        />
      </section>
    </div>
  );
}

export function BranchesWorkLocationsLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href="/dashboard/organization/branches#work-locations" className={className}>
      {children}
    </Link>
  );
}
