"use client";

import { format } from "date-fns";
import { Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/common/input";
import { buttonVariants } from "@/components/common/button";
import { filterDashboardSearch } from "@/lib/dashboard/search-catalog";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { hasPermission } from "@/lib/permissions/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/auth-provider";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function DashboardHeader() {
  const router = useRouter();
  const { profile } = useAuth();
  const [now, setNow] = useState(() => new Date());
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const firstName = profile.employee.firstName;
  const permissionCodes = profile.permissionCodes;
  const canAddEmployee = hasPermission(permissionCodes, "employee.create");

  const suggestions = useMemo(
    () => filterDashboardSearch(query, permissionCodes, hasPermission),
    [query, permissionCodes],
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function goTo(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const selected = suggestions[activeIndex] ?? suggestions[0];
    if (selected) {
      goTo(selected.href);
      return;
    }
    const term = query.trim();
    if (!term) return;
    goTo(`${EMPLOYEE_ROUTES.list}?search=${encodeURIComponent(term)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(suggestions.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <section className="rounded-xl border bg-card px-5 py-6 shadow-sm md:px-7 md:py-7">
        <div className="flex items-start justify-between gap-4">
          <h2 className="min-w-0 truncate text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            {greetingForHour(now.getHours())}, {firstName}
          </h2>
          <p className="shrink-0 pt-1.5 text-sm text-muted-foreground">
            {format(now, "EEE, d MMM")} · {format(now, "hh:mm a")}
          </p>
        </div>
        <p className="mt-2 truncate text-sm text-muted-foreground md:text-[15px]">
          Here&apos;s what is happening in your organization today.
        </p>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div ref={rootRef} className="relative min-w-0 flex-1">
          <form onSubmit={onSearch}>
            <Search className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search HR modules, actions, reports…"
              className="h-9 pl-8 text-sm"
              aria-label="Search HR"
              aria-expanded={open}
              aria-autocomplete="list"
              role="combobox"
            />
          </form>

          {open && suggestions.length > 0 ? (
            <ul
              role="listbox"
              className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-40 max-h-72 overflow-auto rounded-xl border bg-popover p-1.5 shadow-lg"
            >
              {suggestions.map((item, index) => (
                <li key={item.id} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors",
                      index === activeIndex ? "bg-accent" : "hover:bg-muted/70",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goTo(item.href)}
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {canAddEmployee ? (
          <Link
            href={EMPLOYEE_ROUTES.new}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-9 shrink-0 gap-1.5 px-3 text-xs",
            )}
          >
            <UserPlus className="size-3.5" />
            Add Employee
          </Link>
        ) : null}
      </div>
    </div>
  );
}
