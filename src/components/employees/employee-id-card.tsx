"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { EmploymentStatusBadge } from "@/components/employees/employment-status-badge";
import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/employees/constants";
import {
  removeProfileImageAction,
  uploadProfileImageAction,
} from "@/lib/employees/profile-image-actions";
import { cn } from "@/lib/utils";
import type { EmploymentStatus } from "@/types/auth";

type EmployeeIdCardProps = {
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation: string | null;
  departmentName: string | null;
  employmentTypeName: string;
  employmentStatus: EmploymentStatus;
  imageUrl: string | null;
  profilePath: string;
  canEdit: boolean;
  className?: string;
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
  imageUrl: initialUrl,
  profilePath: _profilePath,
  canEdit,
  className,
}: EmployeeIdCardProps) {
  const router = useRouter();
  const waveGradientId = useId().replace(/:/g, "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [isPending, startTransition] = useTransition();
  const [photoHovered, setPhotoHovered] = useState(false);

  const fullName = `${firstName} ${lastName}`.trim();
  const roleTitle = designation?.trim() || "Team Member";

  useEffect(() => {
    setImageUrl(initialUrl);
  }, [initialUrl]);

  const openPicker = () => {
    if (!canEdit || isPending) return;
    fileInputRef.current?.click();
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

    const preview = URL.createObjectURL(file);
    setImageUrl(preview);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadProfileImageAction(employeeId, formData);
      if (!result.success) {
        toast.error(result.message);
        setImageUrl(initialUrl);
        return;
      }

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
      toast.success("Profile photo removed");
      router.refresh();
    });
  };

  return (
    <div
      className={cn(
        "relative mx-auto h-[30rem] w-full max-w-[19rem]",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-border/70 bg-card",
          "shadow-[0_2px_6px_rgba(15,23,42,0.06),0_18px_42px_-18px_rgba(15,23,42,0.28)]",
          "dark:border-white/10 dark:shadow-[0_2px_8px_rgba(0,0,0,0.35),0_20px_48px_-20px_rgba(0,0,0,0.65)]",
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[1.65rem] ring-1 ring-inset ring-black/[0.04] dark:ring-white/10" />

        <div className="absolute left-4 top-4 z-10 rounded-full bg-background/90 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground shadow-sm backdrop-blur dark:bg-black/55 dark:text-white/85 dark:ring-1 dark:ring-white/15">
          DIGITAL ID
        </div>

        <div
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden bg-muted",
            canEdit && "cursor-pointer",
          )}
          onMouseEnter={() => setPhotoHovered(true)}
          onMouseLeave={() => setPhotoHovered(false)}
          onClick={canEdit ? openPicker : undefined}
          onKeyDown={
            canEdit
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openPicker();
                  }
                }
              : undefined
          }
          role={canEdit ? "button" : undefined}
          tabIndex={canEdit ? 0 : undefined}
          aria-label={canEdit ? "Change profile photo" : undefined}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={fullName}
              className="size-full object-cover object-[center_20%]"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-muted">
              <span
                className={cn(
                  "flex size-[4.5rem] items-center justify-center rounded-full bg-card text-foreground shadow-md ring-1 ring-border/60 transition dark:ring-white/10",
                  canEdit && photoHovered ? "scale-[1.03] shadow-lg" : "opacity-90",
                )}
              >
                <Camera className="size-7" strokeWidth={1.75} />
              </span>
            </div>
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
                "absolute bottom-14 right-3 z-30 flex items-center gap-1.5 transition-opacity duration-200",
                photoHovered ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  openPicker();
                }}
                disabled={isPending}
                className="flex size-8 items-center justify-center rounded-full bg-background/95 text-foreground shadow-md ring-1 ring-border/70 backdrop-blur-sm hover:bg-background disabled:cursor-not-allowed dark:bg-card/95 dark:ring-white/15"
                aria-label="Upload profile photo"
              >
                <Upload className="size-3.5" />
              </button>
              {imageUrl ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isPending}
                  className="flex size-8 items-center justify-center rounded-full bg-background/95 text-destructive shadow-md ring-1 ring-border/70 backdrop-blur-sm hover:bg-background disabled:cursor-not-allowed dark:bg-card/95 dark:ring-white/15"
                  aria-label="Remove profile photo"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="relative z-10 -mt-[3.1rem] shrink-0">
          <svg
            className="absolute inset-x-0 top-0 h-[3.1rem] w-full"
            viewBox="0 0 360 68"
            preserveAspectRatio="none"
            aria-hidden
          >
            <defs>
              <linearGradient
                id={waveGradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor="#ffffff"
                  className="dark:[stop-color:oklch(0.15_0.025_265)]"
                />
                <stop
                  offset="50%"
                  stopColor="#f4eefc"
                  className="dark:[stop-color:oklch(0.175_0.04_280)]"
                />
                <stop
                  offset="100%"
                  stopColor="#d9c8f0"
                  className="dark:[stop-color:oklch(0.22_0.055_290)]"
                />
              </linearGradient>
            </defs>
            <path
              fill={`url(#${waveGradientId})`}
              d="M0 68V28C44 10 86 4 128 10C178 18 210 38 260 46C300 52 330 46 360 36V68H0Z"
            />
          </svg>

          <div className="relative bg-gradient-to-br from-white via-[#f4eefc] to-[#d9c8f0] px-5 pb-5 pt-9 dark:from-[oklch(0.15_0.025_265)] dark:via-[oklch(0.17_0.04_280)] dark:to-[oklch(0.22_0.055_290)]">
            <p className="break-words text-[1.15rem] font-bold leading-snug tracking-tight text-foreground">
              {fullName}
            </p>
            <p className="mt-2 break-words text-[0.92rem] leading-relaxed text-muted-foreground">
              {roleTitle}
            </p>
            <p className="mt-2.5 font-mono text-[0.7rem] font-semibold tracking-[0.08em] text-muted-foreground">
              ID · {employeeCode}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="inline-flex w-fit rounded-full bg-muted/80 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide text-muted-foreground ring-1 ring-border/60 dark:bg-white/5 dark:text-foreground/80 dark:ring-white/12">
                {employmentTypeName}
              </p>
              <EmploymentStatusBadge
                status={employmentStatus === "draft" ? "active" : employmentStatus}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
