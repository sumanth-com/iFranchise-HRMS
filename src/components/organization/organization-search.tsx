"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { searchOrganizationAction } from "@/lib/organization/actions";
import { ORGANIZATION_ROUTES } from "@/lib/organization/constants";
import type { OrgSearchResult } from "@/types/organization";

export function OrganizationSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrgSearchResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    startTransition(async () => {
      const res = await searchOrganizationAction(query.trim());
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setResults(res.data);
    });
  }

  const hasResults =
    results &&
    (results.departments.length > 0 ||
      results.branches.length > 0 ||
      results.designations.length > 0 ||
      results.workLocations.length > 0);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Global Search</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Search departments, branches, designations, and work locations.
          </p>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organization..."
            className="mt-2 h-9"
          />
        </div>
        <Button type="submit" disabled={isPending} className="h-9 lg:w-28">
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </form>

      {results && !hasResults ? (
        <p className="mt-3 text-sm text-muted-foreground">No results found.</p>
      ) : null}

      {hasResults ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {results!.departments.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Departments</p>
              <ul className="mt-2 space-y-1">
                {results!.departments.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => router.push(ORGANIZATION_ROUTES.departments)}
                    >
                      {d.name} ({d.code})
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {results!.branches.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Branches</p>
              <ul className="mt-2 space-y-1">
                {results!.branches.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => router.push(ORGANIZATION_ROUTES.branches)}
                    >
                      {b.name} ({b.code})
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {results!.designations.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Designations</p>
              <ul className="mt-2 space-y-1">
                {results!.designations.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => router.push(ORGANIZATION_ROUTES.designations)}
                    >
                      {d.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {results!.workLocations.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Locations</p>
              <ul className="mt-2 space-y-1">
                {results!.workLocations.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => router.push(ORGANIZATION_ROUTES.workLocations)}
                    >
                      {l.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
