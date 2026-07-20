"use client";

import { format } from "date-fns";
import { useMemo, useState, type ComponentType } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  ChevronUp,
  Clock,
  Hash,
  Mail,
  Phone,
  Search,
  Users,
  X,
} from "lucide-react";

import { Input } from "@/components/common/input";
import { cn } from "@/lib/utils";
import type { EmployeeDirectoryPerson } from "@/types/employee-directory";

const CARD_HEIGHT = "h-[21.5rem]";

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function experienceLabel(years: number | null) {
  if (years == null) return "—";
  if (years < 1) return "< 1 year";
  if (years === 1) return "1 year";
  return `${years} years`;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
  breakAll = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  breakAll?: boolean;
}) {
  const valueClass = cn(
    "font-medium leading-snug text-foreground",
    breakAll ? "break-all" : "break-words",
  );

  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} className={cn(valueClass, "hover:underline")}>
            {value}
          </a>
        ) : (
          <p className={valueClass}>{value}</p>
        )}
      </div>
    </div>
  );
}

function CardPhoto({
  person,
  className,
}: {
  person: EmployeeDirectoryPerson;
  className?: string;
}) {
  const label = initials(person.firstName, person.lastName);

  if (person.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={person.avatarUrl}
        alt={person.fullName}
        className={cn("h-full w-full object-cover object-top", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/15",
        className,
      )}
    >
      <span className="text-3xl font-semibold tracking-wide text-muted-foreground/70">
        {label}
      </span>
    </div>
  );
}

function DirectoryCard({ person }: { person: EmployeeDirectoryPerson }) {
  const [open, setOpen] = useState(false);

  return (
    <article
      className={cn(
        CARD_HEIGHT,
        "relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow",
        "hover:shadow-md",
        open && "ring-1 ring-primary/20",
      )}
    >
      {/* Front — full-width photo, name, role + ID, view more */}
      <div className="flex h-full flex-col pb-11">
        <div className="relative h-[11.5rem] w-full shrink-0 bg-muted">
          <CardPhoto person={person} />
        </div>

        <div className="flex flex-1 flex-col justify-center px-4 text-center">
          <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight">
            {person.fullName}
          </h3>
          <p className="mt-1.5 line-clamp-1 text-xs text-muted-foreground">
            {person.designationTitle || "Team Member"}
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            <span className="font-mono text-[11px] font-medium">{person.employeeCode}</span>
          </p>
        </div>
      </div>

      {/* Detail overlay — opens inside the card, no stretch */}
      <div
        className={cn(
          "absolute inset-0 z-10 flex flex-col bg-card/98 backdrop-blur-[2px] transition-all duration-300 ease-out",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="flex flex-1 flex-col overflow-hidden pb-11">
          <div className="relative h-24 w-full shrink-0 bg-muted">
            <CardPhoto person={person} />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
          </div>
          <div className="border-b px-4 pb-3">
            <p className="text-sm font-semibold leading-snug">{person.fullName}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
              <span className="break-words">{person.designationTitle || "Team Member"}</span>
              <span className="mx-1.5 text-muted-foreground/40">·</span>
              <span className="font-mono">{person.employeeCode}</span>
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
            <InfoRow
              icon={Mail}
              label="Email"
              value={person.email}
              href={`mailto:${person.email}`}
              breakAll
            />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={person.phone || "—"}
              href={person.phone ? `tel:${person.phone}` : undefined}
            />
            <InfoRow
              icon={Building2}
              label="Department"
              value={person.departmentName || "—"}
            />
            <InfoRow
              icon={Briefcase}
              label="Designation"
              value={person.designationTitle || "—"}
            />
            <InfoRow icon={Hash} label="Employee ID" value={person.employeeCode} />
            <InfoRow
              icon={CalendarDays}
              label="Joined"
              value={
                person.dateOfJoining
                  ? format(new Date(person.dateOfJoining), "d MMM yyyy")
                  : "—"
              }
            />
            <InfoRow
              icon={Clock}
              label="Experience"
              value={experienceLabel(person.experienceYears)}
            />
          </div>
        </div>
      </div>

      {/* Fixed footer toggle — never changes card height */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "absolute inset-x-0 bottom-0 z-20 flex h-10 items-center justify-center gap-1 border-t bg-muted/30 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
          open && "bg-primary/5 text-primary",
        )}
        aria-expanded={open}
        aria-label={
          open ? `Hide details for ${person.fullName}` : `Show details for ${person.fullName}`
        }
      >
        <ChevronUp
          className={cn("size-4 transition-transform duration-300", open && "rotate-180")}
        />
        {open ? "Close" : "View more"}
      </button>
    </article>
  );
}

export function EmployeeDirectoryView({ people }: { people: EmployeeDirectoryPerson[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((person) => {
      const haystack = [
        person.fullName,
        person.employeeCode,
        person.designationTitle,
        person.departmentName,
        person.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [people, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">Employee Directory</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect with colleagues across the organization.
              </p>
            </div>

            <div className="flex w-full items-center gap-3 sm:ml-auto sm:w-auto sm:min-w-0">
              <div className="relative w-full min-w-[12rem] sm:w-72 md:w-80 lg:w-96">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, role, ID, department"
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
              Try a different search, or check back when more colleagues join.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filtered.map((person) => (
              <DirectoryCard key={person.id} person={person} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
