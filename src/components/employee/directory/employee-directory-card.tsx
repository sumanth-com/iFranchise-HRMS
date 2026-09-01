"use client";

import { useEffect, useState, type ComponentType } from "react";
import Image from "next/image";
import {
  Briefcase,
  Building2,
  ChevronUp,
  Hash,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/common/button";
import { getDirectoryAssetPhoto } from "@/lib/employee/directory-asset-photos";
import { directoryDepartmentLabel } from "@/lib/employee/directory-listing";
import { getSignedUrlAction } from "@/lib/employees/actions";
import { cn } from "@/lib/utils";
import type { EmployeeDirectoryPerson } from "@/types/employee-directory";

export type DirectoryCardPerson = EmployeeDirectoryPerson & {
  managerName?: string | null;
};

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
    <div className="flex flex-col items-center gap-1 text-center text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <p className="font-medium leading-snug break-words text-foreground">{value}</p>
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
  const assetPhoto = getDirectoryAssetPhoto(person);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(
    person.avatarUrl ?? null,
  );
  const [assetFailed, setAssetFailed] = useState(false);
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setAssetFailed(false);
    setRemoteFailed(false);

    if (person.avatarUrl) {
      setResolvedAvatarUrl(person.avatarUrl);
      return;
    }

    if (!person.profileImagePath) {
      setResolvedAvatarUrl(null);
      return;
    }

    let cancelled = false;
    void getSignedUrlAction("profileImages", person.profileImagePath).then((result) => {
      if (!cancelled && result.success) {
        setResolvedAvatarUrl(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [person.avatarUrl, person.profileImagePath]);

  const photoClass = cn(
    "absolute inset-0 h-full w-full object-cover object-top",
    className,
  );
  const showUpload = Boolean(resolvedAvatarUrl) && !remoteFailed;
  const showAsset = Boolean(assetPhoto) && !assetFailed && !showUpload;

  if (showUpload && resolvedAvatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedAvatarUrl}
        alt={person.fullName}
        className={photoClass}
        onError={() => setRemoteFailed(true)}
      />
    );
  }

  if (showAsset && assetPhoto) {
    return (
      <Image
        src={assetPhoto}
        alt={person.fullName}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 40vw, 280px"
        className={photoClass}
        onError={() => setAssetFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-violet-600 via-violet-500 to-indigo-600",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.28),transparent_42%)]" />
      <div className="pointer-events-none absolute bottom-[-18%] left-1/2 h-[55%] w-[70%] -translate-x-1/2 rounded-full bg-black/25 blur-2xl" />
      <span className="relative flex aspect-square w-[42%] max-w-[4.75rem] items-center justify-center rounded-full bg-white/15 shadow-[0_10px_24px_rgba(46,16,101,0.45)] ring-2 ring-white/25">
        <UserRound
          className="size-[58%] text-white drop-shadow-[0_6px_10px_rgba(0,0,0,0.28)]"
          strokeWidth={1.75}
          aria-hidden
        />
      </span>
      <span className="sr-only">{person.fullName}</span>
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
        "relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow",
        "hover:shadow-md",
        showExpand && open && "ring-1 ring-primary/20",
      )}
    >
      <div className="relative isolate aspect-[4/5] w-full shrink-0 overflow-hidden bg-muted">
        <CardPhoto person={person} />
      </div>

      <div className="flex h-14 shrink-0 items-center justify-center px-4 text-center">
        <h3 className="line-clamp-1 text-[15px] font-semibold tracking-tight">
          {person.fullName}
        </h3>
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
            <div className="flex flex-col items-center px-4 pt-5 pb-4 text-center">
              <div className="relative size-[5.25rem] shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-border/50">
                <CardPhoto person={person} />
              </div>
              <p className="mt-3 text-sm font-semibold leading-snug">{person.fullName}</p>
            </div>

            <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-3">
              <InfoRow icon={Hash} label="Employee ID" value={person.employeeCode} />
              <InfoRow
                icon={Building2}
                label="Department"
                value={directoryDepartmentLabel(person.departmentName) || "—"}
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
        "grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
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
