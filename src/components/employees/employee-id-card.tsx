"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/employees/constants";
import {
  removeProfileImageAction,
  uploadProfileImageAction,
} from "@/lib/employees/actions";
import { cn } from "@/lib/utils";
import { EmployeeAccountStatusBadge } from "@/components/employees/employee-account-status-badge";
import type { EmployeeAccountStatus } from "@/types/employee";

type EmployeeIdCardProps = {
  employeeId: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  designation: string | null;
  departmentName: string | null;
  employmentTypeName: string;
  accountStatus: EmployeeAccountStatus;
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
  accountStatus,
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
          "relative flex h-full flex-col overflow-hidden rounded-[1.65rem] border border-black/[0.06] bg-white",
          "shadow-[0_2px_6px_rgba(15,23,42,0.06),0_18px_42px_-18px_rgba(15,23,42,0.35)]",
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[1.65rem] ring-1 ring-inset ring-white/80" />

        <div className="absolute left-4 top-4 z-10 rounded-full bg-white/85 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.16em] text-neutral-600 shadow-sm backdrop-blur">
          DIGITAL ID
        </div>

        <div
          className={cn(
            "relative min-h-0 flex-1 overflow-hidden bg-[#d9dbe1]",
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
            <div className="flex size-full items-center justify-center bg-[#d8d8de]">
              <span
                className={cn(
                  "flex size-[4.5rem] items-center justify-center rounded-full bg-white text-neutral-800 shadow-md ring-1 ring-black/5 transition",
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
                className="flex size-8 items-center justify-center rounded-full bg-white/95 text-foreground shadow-md ring-1 ring-black/5 backdrop-blur-sm hover:bg-white disabled:cursor-not-allowed"
                aria-label="Upload profile photo"
              >
                <Upload className="size-3.5" />
              </button>
              {imageUrl ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isPending}
                  className="flex size-8 items-center justify-center rounded-full bg-white/95 text-destructive shadow-md ring-1 ring-black/5 backdrop-blur-sm hover:bg-white disabled:cursor-not-allowed"
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
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="50%" stopColor="#f7f2fc" />
                <stop offset="100%" stopColor="#dccff3" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#${waveGradientId})`}
              d="M0 68V28C44 10 86 4 128 10C178 18 210 38 260 46C300 52 330 46 360 36V68H0Z"
            />
          </svg>

          <div className="relative bg-gradient-to-br from-white via-[#f7f2ff] to-[#d7c6f3] px-5 pb-5 pt-9">
            <p className="break-words text-[1.15rem] font-bold leading-snug tracking-tight text-neutral-950">
              {fullName}
            </p>
            <p className="mt-2 break-words text-[0.92rem] leading-relaxed text-neutral-500">
              {roleTitle}
            </p>
            <p className="mt-2.5 font-mono text-[0.7rem] font-semibold tracking-[0.08em] text-neutral-600/90">
              ID · {employeeCode}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="inline-flex w-fit rounded-full bg-white/70 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide text-neutral-600 shadow-sm ring-1 ring-black/5">
                {employmentTypeName}
              </p>
              <EmployeeAccountStatusBadge status={accountStatus} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
