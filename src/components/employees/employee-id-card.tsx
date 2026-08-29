"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import {
  EmployeeDeactivatedBadge,
  isEmployeeAccountDeactivated,
} from "@/components/employees/employee-account-status-badge";
import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/employees/constants";
import {
  getProfileImageSignedUrlAction,
  removeProfileImageAction,
  uploadProfileImageAction,
} from "@/lib/employees/profile-image-actions";
import { notifyProfilePhotoChanged } from "@/lib/employees/profile-photo-events";
import { optimizeProfileImageFile } from "@/lib/media/client-image-optimize";
import { cn } from "@/lib/utils";
import type { EmploymentStatus } from "@/types/auth";
import type { EmployeeAccountStatus } from "@/types/employee";

type EmployeeIdCardProps = {
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation: string | null;
  departmentName: string | null;
  employmentTypeName: string;
  employmentStatus: EmploymentStatus;
  accountStatus?: EmployeeAccountStatus;
  profileImagePath?: string | null;
  imageUrl: string | null;
  profilePath: string;
  canEdit: boolean;
  className?: string;
  hideHeaderLabel?: boolean;
  stretchHeight?: boolean;
};

export function EmployeeIdCard({
  employeeId,
  firstName,
  lastName,
  employeeCode,
  designation,
  departmentName: _departmentName,
  employmentTypeName,
  employmentStatus,
  accountStatus,
  profileImagePath,
  imageUrl: initialUrl,
  profilePath: _profilePath,
  canEdit,
  className,
  hideHeaderLabel = false,
  stretchHeight = false,
}: EmployeeIdCardProps) {
  const router = useRouter();
  const waveGradientId = useId().replace(/:/g, "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const resolvedPathRef = useRef<string | null>(profileImagePath ?? null);
  const [imageUrl, setImageUrl] = useState<string | null>(initialUrl);
  const [isPending, startTransition] = useTransition();

  const fullName = `${firstName} ${lastName}`.trim();
  const roleTitle = designation?.trim() || "Team Member";
  const roleAndId = `${roleTitle} · ID · ${employeeCode}`;
  const accountDeactivated =
    accountStatus != null && isEmployeeAccountDeactivated(accountStatus);

  useEffect(() => {
    if (previewUrlRef.current) return;

    if (initialUrl?.startsWith("blob:")) {
      setImageUrl(initialUrl);
      return;
    }

    if (initialUrl) {
      setImageUrl(initialUrl);
      resolvedPathRef.current = profileImagePath ?? null;
      return;
    }

    if (!profileImagePath) {
      setImageUrl(null);
      resolvedPathRef.current = null;
      return;
    }

    if (resolvedPathRef.current === profileImagePath) return;

    let cancelled = false;
    void getProfileImageSignedUrlAction(employeeId, profileImagePath).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setImageUrl(result.data);
        resolvedPathRef.current = profileImagePath;
      } else {
        setImageUrl(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [profileImagePath, initialUrl]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  const openPicker = () => {
    if (!canEdit || isPending) return;
    fileInputRef.current?.click();
  };

  const handlePhotoAreaClick = () => {
    if (!canEdit || isPending) return;
    openPicker();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      event.target.value = "";
      return;
    }

    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      toast.error("Profile image must be 10 MB or smaller");
      event.target.value = "";
      return;
    }

    startTransition(async () => {
      const optimized = await optimizeProfileImageFile(file);
      if (optimized.size > PROFILE_IMAGE_MAX_BYTES) {
        toast.error("Profile image must be 10 MB or smaller");
        event.target.value = "";
        return;
      }

      const preview = URL.createObjectURL(optimized);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      previewUrlRef.current = preview;
      setImageUrl(preview);
      notifyProfilePhotoChanged({ employeeId, imageUrl: preview });

      const formData = new FormData();
      formData.append("file", optimized);

      const result = await uploadProfileImageAction(employeeId, formData);
      if (!result.success) {
        toast.error(result.message);
        if (previewUrlRef.current === preview) {
          URL.revokeObjectURL(preview);
          previewUrlRef.current = null;
        }
        setImageUrl(initialUrl);
        notifyProfilePhotoChanged({ employeeId, imageUrl: initialUrl });
        return;
      }

      notifyProfilePhotoChanged({ employeeId, imageUrl: preview });
      toast.success("Profile photo updated");
      router.refresh();
    });

    event.target.value = "";
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    startTransition(async () => {
      const result = await removeProfileImageAction(employeeId);
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setImageUrl(null);
      resolvedPathRef.current = null;
      notifyProfilePhotoChanged({ employeeId, imageUrl: null });
      toast.success("Profile photo removed");
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[19rem]",
        stretchHeight ? "h-full min-h-0" : "h-[30rem]",
        className,
      )}
    >
      <div
        className={cn(
          "card-surface-static relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
          "dark:border-white/15 dark:bg-[#070d1a] dark:shadow-none",
        )}
      >
        {hideHeaderLabel ? null : (
          <div className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.16em] text-neutral-600 shadow-sm backdrop-blur dark:bg-black/70 dark:text-white dark:ring-1 dark:ring-white/25">
            DIGITAL ID
          </div>
        )}

        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            stretchHeight
              ? imageUrl
                ? "min-h-[15rem] flex-1"
                : "min-h-[13rem] flex-1"
              : "min-h-0 flex-1",
          )}
        >
          <div
            className={cn(
              "group/photo relative overflow-hidden",
              canEdit && "cursor-pointer",
              // Keep photo controls inside the image plane (above the wave/pad), not on the bottom card.
              "absolute inset-x-0 top-0 bottom-[3.5rem]",
            )}
            onClick={canEdit ? handlePhotoAreaClick : undefined}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={fullName}
                decoding="async"
                loading="eager"
                onError={() => {
                  if (previewUrlRef.current) return;
                  setImageUrl(null);
                  resolvedPathRef.current = null;
                  notifyProfilePhotoChanged({ employeeId, imageUrl: null });
                }}
                className="absolute inset-0 size-full object-cover object-[center_22%]"
              />
            ) : (
              <div className="absolute inset-0 bg-muted" aria-hidden />
            )}

            {canEdit ? (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
            ) : null}

            {canEdit ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-black/0 transition-colors duration-200",
                  "opacity-0 group-hover/photo:bg-black/25 group-hover/photo:opacity-100 group-focus-within/photo:bg-black/25 group-focus-within/photo:opacity-100",
                  isPending && "opacity-100 bg-black/20",
                )}
              >
                <div className="pointer-events-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openPicker();
                    }}
                    disabled={isPending}
                    className="flex size-10 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md ring-1 ring-border/70 backdrop-blur-sm hover:bg-background disabled:cursor-not-allowed dark:bg-card/95 dark:ring-white/15"
                    aria-label="Upload profile photo"
                  >
                    <Upload className="size-4 shrink-0" />
                  </button>
                  {imageUrl ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemove(event);
                      }}
                      disabled={isPending}
                      className="flex size-10 items-center justify-center rounded-full bg-background/95 text-destructive shadow-md ring-1 ring-border/70 backdrop-blur-sm hover:bg-background disabled:cursor-not-allowed dark:bg-card/95 dark:ring-white/15"
                      aria-label="Remove profile photo"
                    >
                      <Trash2 className="size-4 shrink-0" />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 -mt-[3.5rem] shrink-0">
          {/* Light wave + panel */}
          <div className="dark:hidden">
            <svg
              className="absolute inset-x-0 top-0 h-[3.5rem] w-full"
              viewBox="0 0 360 68"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient
                  id={`${waveGradientId}-light`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="50%" stopColor="#f4eefc" />
                  <stop offset="100%" stopColor="#d9c8f0" />
                </linearGradient>
              </defs>
              <path
                fill={`url(#${waveGradientId}-light)`}
                d="M0 68V28C44 10 86 4 128 10C178 18 210 38 260 46C300 52 330 46 360 36V68H0Z"
              />
            </svg>
            <div className="relative flex min-h-[10.5rem] flex-col items-center justify-center bg-gradient-to-br from-white via-[#f4eefc] to-[#d9c8f0] px-5 pb-6 pt-10 text-center">
              <p className="w-full break-words text-[1.2rem] font-bold leading-snug tracking-tight text-neutral-950">
                {fullName}
              </p>
              <p className="mt-2 w-full line-clamp-2 break-words text-[0.82rem] leading-snug text-neutral-500">
                {roleAndId}
              </p>
              <div className="mt-3.5 flex w-full flex-wrap items-center justify-center gap-2">
                <p className="inline-flex w-fit rounded-full bg-white/70 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide text-neutral-700 shadow-sm ring-1 ring-black/5">
                  {employmentTypeName}
                </p>
                {accountDeactivated ? (
                  <EmployeeDeactivatedBadge />
                ) : (
                  <EmploymentStatusBadge
                    status={employmentStatus === "draft" ? "active" : employmentStatus}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Dark wave + panel — separate tree so light gradient never paints in dark mode */}
          <div className="hidden dark:block">
            <svg
              className="absolute inset-x-0 top-0 h-[3.5rem] w-full"
              viewBox="0 0 360 68"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient
                  id={`${waveGradientId}-dark`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#0b1224" />
                  <stop offset="55%" stopColor="#0b1224" />
                  <stop offset="100%" stopColor="#111b33" />
                </linearGradient>
              </defs>
              <path
                fill={`url(#${waveGradientId}-dark)`}
                d="M0 68V28C44 10 86 4 128 10C178 18 210 38 260 46C300 52 330 46 360 36V68H0Z"
              />
            </svg>
            <div className="relative flex min-h-[10.5rem] flex-col items-center justify-center bg-[#0b1224] px-5 pb-6 pt-10 text-center">
              <p className="w-full break-words text-[1.2rem] font-bold leading-snug tracking-tight text-white">
                {fullName}
              </p>
              <p className="mt-2 w-full line-clamp-2 break-words text-[0.82rem] leading-snug text-slate-200">
                {roleAndId}
              </p>
              <div className="mt-3.5 flex w-full flex-wrap items-center justify-center gap-2">
                <p className="inline-flex w-fit rounded-full bg-white/10 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide text-slate-100 ring-1 ring-white/20">
                  {employmentTypeName}
                </p>
                {accountDeactivated ? (
                  <EmployeeDeactivatedBadge className="shadow-none" />
                ) : (
                  <EmploymentStatusBadge
                    status={employmentStatus === "draft" ? "active" : employmentStatus}
                    className="shadow-none"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
