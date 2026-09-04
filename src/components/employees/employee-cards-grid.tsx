"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Eye, MoreHorizontal, Pencil, Trash2, UserCog } from "lucide-react";

import { Button } from "@/components/common/button";
import { ProfilePhotoFallback } from "@/components/employees/profile-photo-fallback";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDirectoryAssetPhoto } from "@/lib/employee/directory-asset-photos";
import { formatDesignationDisplay } from "@/lib/employees/designation-display";
import { getSignedUrlAction } from "@/lib/employees/actions";
import { resolveEmployeeModuleRoutes } from "@/lib/employees/constants";
import { subscribeProfilePhotoChanged } from "@/lib/employees/profile-photo-events";
import { cn } from "@/lib/utils";
import type { EmployeeListItem } from "@/types/employee";

function CardPhoto({ employee }: { employee: EmployeeListItem }) {
  const assetPhoto = getDirectoryAssetPhoto(employee);
  const [resolvedAvatarUrl, setResolvedAvatarUrl] = useState<string | null>(
    employee.profileImageSignedUrl ?? null,
  );
  const [assetFailed, setAssetFailed] = useState(false);
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setAssetFailed(false);
    setRemoteFailed(false);

    if (employee.profileImageSignedUrl) {
      setResolvedAvatarUrl(employee.profileImageSignedUrl);
      return;
    }

    if (!employee.profileImagePath) {
      setResolvedAvatarUrl(null);
      return;
    }

    let cancelled = false;
    void getSignedUrlAction("profileImages", employee.profileImagePath).then((result) => {
      if (!cancelled && result.success) {
        setResolvedAvatarUrl(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [employee.profileImagePath, employee.profileImageSignedUrl]);

  useEffect(() => {
    return subscribeProfilePhotoChanged((detail) => {
      if (detail.employeeId !== employee.id) return;
      setRemoteFailed(false);
      setResolvedAvatarUrl(detail.imageUrl);
    });
  }, [employee.id]);

  const photoClass = "absolute inset-0 h-full w-full object-cover object-top";
  const showUpload = Boolean(resolvedAvatarUrl) && !remoteFailed;
  const showAsset = Boolean(assetPhoto) && !assetFailed && !showUpload;

  if (showUpload && resolvedAvatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedAvatarUrl}
        alt={employee.fullName}
        className={photoClass}
        onError={() => setRemoteFailed(true)}
      />
    );
  }

  if (showAsset && assetPhoto) {
    return (
      <Image
        src={assetPhoto}
        alt={employee.fullName}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 40vw, 280px"
        className={photoClass}
        onError={() => setAssetFailed(true)}
      />
    );
  }

  return <ProfilePhotoFallback label={employee.fullName} />;
}

type EmployeeCardsGridProps = {
  employees: EmployeeListItem[];
  canEdit: boolean;
  canDelete: boolean;
  onDelete: (employee: EmployeeListItem) => void;
  onChangeEmploymentType?: (employee: EmployeeListItem) => void;
  routesBasePath?: string;
};

export function EmployeeCardsGrid({
  employees,
  canEdit,
  canDelete,
  onDelete,
  onChangeEmploymentType,
  routesBasePath,
}: EmployeeCardsGridProps) {
  const routes = resolveEmployeeModuleRoutes(routesBasePath);
  const router = useRouter();

  if (employees.length === 0) {
    return (
      <div className="rounded-2xl border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
        No employees found.
      </div>
    );
  }

  return (
    <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {employees.map((employee) => {
        const routeIdentity = {
          employeeCode: employee.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
        };
        const detailHref = routes.detail(routeIdentity);
        const editHref = routes.edit(routeIdentity);
        const designationLabel = formatDesignationDisplay(employee.designationTitle, {
          person: {
            employeeCode: employee.employeeCode,
            firstName: employee.firstName,
            lastName: employee.lastName,
          },
        });

        return (
          <article
            key={employee.id}
            className="group relative flex min-h-0 min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <button
              type="button"
              className="flex w-full cursor-pointer flex-col text-left"
              onClick={() => router.push(detailHref)}
            >
              <div className="relative isolate aspect-[4/5] w-full shrink-0 overflow-hidden bg-muted">
                <CardPhoto employee={employee} />
              </div>

              <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                <h3 className="w-full text-[15px] font-semibold leading-snug tracking-tight">
                  {employee.fullName}
                </h3>
                <div className="mt-1.5 flex w-full items-center justify-center px-1">
                  <span
                    className={cn(
                      "inline-flex max-w-full items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground ring-1 ring-border/60",
                      "line-clamp-2 whitespace-normal text-center leading-snug",
                    )}
                    title={designationLabel}
                  >
                    {designationLabel}
                  </span>
                </div>
              </div>
            </button>

            <div
              className="absolute right-2 top-2 z-10"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      className="size-8 bg-background/90 shadow-sm backdrop-blur"
                      aria-label="Open actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end" className="w-auto min-w-[12.5rem]">
                  <DropdownMenuItem onClick={() => router.push(detailHref)}>
                    <Eye className="size-4" />
                    View
                  </DropdownMenuItem>
                  {canEdit ? (
                    <DropdownMenuItem onClick={() => router.push(editHref)}>
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  {canEdit && onChangeEmploymentType ? (
                    <DropdownMenuItem onClick={() => onChangeEmploymentType(employee)}>
                      <UserCog className="size-4" />
                      <span className="whitespace-nowrap">Change Employment Type</span>
                    </DropdownMenuItem>
                  ) : null}
                  {canDelete ? (
                    <DropdownMenuItem
                      onClick={() => onDelete(employee)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </article>
        );
      })}
    </div>
  );
}
