"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { ArrowLeft, ArrowRight, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PROFILE_IMAGE_MAX_BYTES } from "@/lib/employees/constants";
import {
  removeProfileImageAction,
  uploadProfileImageAction,
} from "@/lib/employees/actions";
import { siteConfig } from "@/config/site";
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
  departmentName,
  employmentTypeName,
  accountStatus,
  imageUrl: initialUrl,
  profilePath,
  canEdit,
  className,
}: EmployeeIdCardProps) {
  const router = useRouter();
  const waveGradientId = useId().replace(/:/g, "");
  const backPatternId = useId().replace(/:/g, "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [isPending, startTransition] = useTransition();
  const [flipped, setFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const fullName = `${firstName} ${lastName}`.trim();
  const roleTitle = designation?.trim() || "Team Member";
  const isAttendanceCard = profilePath.endsWith("/card");
  const backHeading = isAttendanceCard
    ? "One scan. Your full work story."
    : "Verified identity. Instant access.";
  const backSubtext = isAttendanceCard
    ? "Attendance, leave, and performance — all in one place."
    : "Scan to open your secure employee profile.";

  useEffect(() => {
    setImageUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : siteConfig.url;
    const targetUrl = `${origin}${profilePath}`;

    let cancelled = false;
    QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: { dark: "#1e1b4b", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [profilePath]);

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
      <div className="relative h-full [perspective:1400px]">
        <div
          className={cn(
            "relative h-full w-full transition-transform duration-500 ease-out [transform-style:preserve-3d]",
            flipped && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Front */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col overflow-hidden rounded-[1.65rem] border border-black/[0.06] bg-white [backface-visibility:hidden]",
              "shadow-[0_2px_6px_rgba(15,23,42,0.06),0_18px_42px_-18px_rgba(15,23,42,0.35)]",
              flipped && "pointer-events-none",
            )}
          >
            <div className="pointer-events-none absolute inset-0 z-20 rounded-[1.65rem] ring-1 ring-inset ring-white/80" />

            <div className="absolute left-4 top-4 z-10 rounded-full bg-white/85 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.16em] text-neutral-600 shadow-sm backdrop-blur">
              DIGITAL ID
            </div>

            <div
              className={cn(
                "group/photo relative min-h-0 flex-1 overflow-hidden bg-[#d9dbe1]",
                canEdit && "cursor-pointer",
              )}
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
                      canEdit ? "group-hover/photo:scale-[1.03] group-hover/photo:shadow-lg" : "opacity-90",
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

              {canEdit && imageUrl ? (
                <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-2 bg-gradient-to-t from-black/45 to-transparent px-3 pb-3 pt-10 opacity-0 transition-opacity duration-200 group-hover/photo:opacity-100 group-focus-within/photo:opacity-100">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openPicker();
                    }}
                    disabled={isPending}
                    className="flex size-8 items-center justify-center rounded-full bg-white text-foreground shadow-sm hover:bg-neutral-50 disabled:cursor-not-allowed"
                    aria-label="Change profile photo"
                  >
                    <Camera className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={isPending}
                    className="flex size-8 items-center justify-center rounded-full bg-white text-destructive shadow-sm hover:bg-neutral-50 disabled:cursor-not-allowed"
                    aria-label="Remove profile photo"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
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
                <div className="mt-3 flex flex-wrap items-center gap-2 pr-12">
                  <p className="inline-flex w-fit rounded-full bg-white/70 px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide text-neutral-600 shadow-sm ring-1 ring-black/5">
                    {employmentTypeName}
                  </p>
                  <EmployeeAccountStatusBadge status={accountStatus} />
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              "absolute inset-0 flex flex-col overflow-hidden rounded-[1.65rem] text-white [backface-visibility:hidden] [transform:rotateY(180deg)]",
              "bg-gradient-to-br from-[#6948f5] via-[#7657f7] to-[#45377f]",
              "shadow-[0_2px_6px_rgba(15,23,42,0.06),0_18px_42px_-18px_rgba(15,23,42,0.35)]",
              !flipped && "pointer-events-none",
            )}
          >
            <svg className="pointer-events-none absolute inset-0 size-full opacity-30" aria-hidden>
              <defs>
                <pattern
                  id={backPatternId}
                  width="34"
                  height="34"
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M0 34L34 0" stroke="white" strokeOpacity="0.22" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${backPatternId})`} />
            </svg>

            <div className="absolute left-4 top-4 z-10 rounded-full bg-white/15 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.16em] text-white/95 shadow-sm backdrop-blur">
              DIGITAL ID
            </div>

            <div className="relative flex h-full min-h-0 flex-col px-5 pb-12 pt-12">
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
                <h3 className="max-w-[14.5rem] text-[1.18rem] font-bold leading-snug tracking-tight">
                  {backHeading}
                </h3>
                <p className="mt-1.5 max-w-[13.5rem] text-[0.85rem] leading-relaxed text-white/80">
                  {backSubtext}
                </p>

                <div className="mt-4 rounded-[1.25rem] bg-white p-3 shadow-[0_16px_32px_-16px_rgba(0,0,0,0.45)]">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR code for ${fullName}`}
                      className="size-[7.5rem]"
                    />
                  ) : (
                    <div className="flex size-[7.5rem] items-center justify-center text-xs text-neutral-400">
                      Loading…
                    </div>
                  )}
                </div>

                <div className="mt-3 w-full rounded-2xl bg-white/12 px-4 py-2.5 text-left backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/60 uppercase">
                        Team
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium">
                        {departmentName?.trim() || "Organization"}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-[0.68rem] font-semibold tracking-[0.08em] text-white/80">
                      {employeeCode}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          className={cn(
            "absolute bottom-5 right-4 z-50 flex size-9 items-center justify-center rounded-full",
            "border border-black/5 bg-white/95 text-neutral-800 shadow-md backdrop-blur",
            "transition hover:scale-105 hover:shadow-lg active:scale-95",
          )}
          aria-label={flipped ? "Show front of ID card" : "Show back of ID card"}
        >
          {flipped ? (
            <ArrowLeft className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
