"use client";

import { useEffect, useState, type ComponentType } from "react";
import {
  Briefcase,
  Building2,
  ChevronUp,
  Hash,
  Layers,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { getSignedUrlAction } from "@/lib/employees/actions";
import { cn } from "@/lib/utils";
import type { EmployeeDirectoryPerson } from "@/types/employee-directory";

export type DirectoryCardPerson = EmployeeDirectoryPerson & {
  managerName?: string | null;
};

function initials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground">{label}</p>
        <p className="font-medium leading-snug break-words text-foreground">{value}</p>
      </div>
    </div>
  );
}

function CardPhoto({
  person,
  className,
}: {
  person: DirectoryCardPerson;
  className?: string;
}) {
  const label = initials(person.firstName, person.lastName);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(
    person.avatarUrl ?? null,
  );

  useEffect(() => {
    if (person.avatarUrl) {
      setResolvedAvatarUrl(person.avatarUrl);
      return;
    }

    if (!person.profileImagePath) {
      setResolvedAvatarUrl(null);
      return;
    }

    void getSignedUrlAction("profileImages", person.profileImagePath).then((result) => {
      if (result.success) {
        setResolvedAvatarUrl(result.data);
      }
    });
  }, [person.avatarUrl, person.profileImagePath]);

  if (resolvedAvatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedAvatarUrl}
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
      <span className="text-2xl font-semibold tracking-wide text-muted-foreground/70 sm:text-3xl">
        {label}
      </span>
    </div>
  );
}

type EmployeeDirectoryCardProps = {
  person: DirectoryCardPerson;
  onViewProfile?: (employeeId: string) => void;
  /** When true, footer shows "View profile" instead of expand/collapse. */
  directProfileLink?: boolean;
};

export function EmployeeDirectoryCard({
  person,
  onViewProfile,
  directProfileLink = false,
}: EmployeeDirectoryCardProps) {
  const [open, setOpen] = useState(false);
  const showExpand = !directProfileLink;

  return (
    <article
      className={cn(
        "relative flex h-full min-h-[19.5rem] flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow",
        "hover:shadow-md",
        showExpand && open && "ring-1 ring-primary/20",
      )}
    >
      <div className="relative aspect-[4/3] w-full shrink-0 bg-muted">
        <CardPhoto person={person} />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-3.5 text-center">
        <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight">
          {person.fullName}
        </h3>
        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
          {person.designationTitle || "Team Member"}
          <span className="mx-1.5 text-muted-foreground/40">·</span>
          <span className="font-mono text-[11px] font-medium">{person.employeeCode}</span>
        </p>
      </div>

      {showExpand ? (
        <div
          className={cn(
            "absolute inset-0 z-10 flex flex-col bg-card/98 backdrop-blur-[2px] transition-all duration-300 ease-out",
            open
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0",
          )}
          aria-hidden={!open}
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-10">
            <div className="relative h-20 w-full shrink-0 bg-muted">
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
              <InfoRow icon={Hash} label="Employee ID" value={person.employeeCode} />
              <InfoRow
                icon={Building2}
                label="Department"
                value={person.departmentName || "—"}
              />
              <InfoRow
                icon={Layers}
                label="Vertical / Team"
                value={person.verticalName || "—"}
              />
              <InfoRow
                icon={Briefcase}
                label="Designation"
                value={person.designationTitle || "—"}
              />
              {person.managerName ? (
                <InfoRow icon={Briefcase} label="Reporting to" value={person.managerName} />
              ) : null}
            </div>

            {onViewProfile ? (
              <div className="border-t px-4 py-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-xs"
                  onClick={() => onViewProfile(person.id)}
                >
                  View full profile
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {directProfileLink && onViewProfile ? (
        <div className="mt-auto shrink-0 border-t bg-muted/20 px-4 py-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 w-full text-xs font-medium"
            onClick={() => onViewProfile(person.id)}
          >
            View profile
          </Button>
        </div>
      ) : showExpand ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className={cn(
            "mt-auto flex h-10 shrink-0 items-center justify-center gap-1.5 border-t bg-muted/20 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground",
            open && "relative z-20 bg-primary/5 text-primary",
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
      ) : null}
    </article>
  );
}

export function EmployeeDirectoryGrid({
  people,
  onViewProfile,
  directProfileLink = false,
  className,
}: {
  people: DirectoryCardPerson[];
  onViewProfile?: (employeeId: string) => void;
  directProfileLink?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {people.map((person) => (
        <EmployeeDirectoryCard
          key={person.id}
          person={person}
          onViewProfile={onViewProfile}
          directProfileLink={directProfileLink}
        />
      ))}
    </div>
  );
}
