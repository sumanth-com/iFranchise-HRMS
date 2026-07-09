"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { searchRolesAction } from "@/lib/roles/actions";
import { ROLES_ROUTES } from "@/lib/roles/constants";
import type { RoleSearchResult } from "@/types/roles";

export function RolesSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RoleSearchResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    startTransition(async () => {
      const res = await searchRolesAction(query.trim());
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setResults(res.data);
    });
  }

  const hasResults =
    results &&
    (results.roles.length > 0 ||
      results.permissions.length > 0 ||
      results.employees.length > 0);

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h3 className="text-sm font-semibold">Global Search</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Search roles, permissions, and employees with role assignments.
      </p>
      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search roles & permissions..."
          className="flex-1"
        />
        <Button type="submit" disabled={isPending}>
          <Search className="mr-2 h-4 w-4" />
          Search
        </Button>
      </form>

      {results && !hasResults ? (
        <p className="mt-4 text-sm text-muted-foreground">No results found.</p>
      ) : null}

      {hasResults ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {results!.roles.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Roles</p>
              <ul className="mt-2 space-y-1">
                {results!.roles.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => router.push(ROLES_ROUTES.manage)}
                    >
                      {r.name} ({r.code})
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {results!.permissions.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Permissions</p>
              <ul className="mt-2 space-y-1">
                {results!.permissions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => router.push(ROLES_ROUTES.permissions)}
                    >
                      {p.code}
                      <span className="text-muted-foreground"> · {p.module}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {results!.employees.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Employees</p>
              <ul className="mt-2 space-y-1">
                {results!.employees.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => router.push(ROLES_ROUTES.assignments)}
                    >
                      {e.name} ({e.employeeCode})
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
