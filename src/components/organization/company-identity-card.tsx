"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { DEFAULT_BRAND_LOGO_PATH } from "@/lib/brand/constants";
import { ORGANIZATION_LOGO_MAX_BYTES } from "@/lib/organization/constants";
import {
  removeOrganizationLogoAction,
  uploadOrganizationLogoAction,
} from "@/lib/organization/actions";
import { cn } from "@/lib/utils";

type Props = {
  companyName: string;
  legalName: string | null;
  logoUrl: string | null;
  hasCustomLogo: boolean;
  canEdit: boolean;
  className?: string;
};

export function CompanyIdentityCard({
  companyName,
  legalName,
  logoUrl,
  hasCustomLogo,
  canEdit,
  className,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultLogoUrl = DEFAULT_BRAND_LOGO_PATH;
  const resolvedLogoUrl = logoUrl ?? defaultLogoUrl;
  const [previewUrl, setPreviewUrl] = useState(resolvedLogoUrl);
  const [isCustomLogo, setIsCustomLogo] = useState(hasCustomLogo);
  const [isPending, startTransition] = useTransition();
  const [photoHovered, setPhotoHovered] = useState(false);

  useEffect(() => {
    setPreviewUrl(logoUrl ?? defaultLogoUrl);
    setIsCustomLogo(hasCustomLogo);
  }, [logoUrl, hasCustomLogo, defaultLogoUrl]);

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

    if (file.size > ORGANIZATION_LOGO_MAX_BYTES) {
      toast.error("Company logo must be 10 MB or smaller");
      event.target.value = "";
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadOrganizationLogoAction(formData);
      if (!result.success) {
        toast.error(result.message);
        setPreviewUrl(resolvedLogoUrl);
        return;
      }

      setPreviewUrl(result.data?.logoUrl ?? preview);
      setIsCustomLogo(true);
      toast.success("Company logo updated");
      router.refresh();
    });

    event.target.value = "";
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    startTransition(async () => {
      const result = await removeOrganizationLogoAction();
      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setPreviewUrl(defaultLogoUrl);
      setIsCustomLogo(false);
      toast.success("Custom logo removed");
      router.refresh();
    });
  };

  return (
    <div className={cn("relative mx-auto w-full max-w-[24rem]", className)}>
      <div
        className={cn(
          "relative flex min-h-[32rem] flex-col overflow-hidden rounded-[1.65rem] border border-black/[0.06] bg-white",
          "shadow-[0_2px_6px_rgba(15,23,42,0.06),0_18px_42px_-18px_rgba(15,23,42,0.35)]",
        )}
      >
        <div className="pointer-events-none absolute inset-0 z-20 rounded-[1.65rem] ring-1 ring-inset ring-white/80" />

        <div
          className={cn(
            "relative flex min-h-[22rem] flex-1 items-center justify-center overflow-hidden bg-[#eef0f4] p-8",
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
          aria-label={canEdit ? "Change company logo" : undefined}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`${companyName} logo`}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <span className="flex size-[5.5rem] items-center justify-center rounded-full bg-white text-neutral-800 shadow-md ring-1 ring-black/5">
              <Camera className="size-8" strokeWidth={1.75} />
            </span>
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
                "absolute bottom-4 right-3 z-30 flex items-center gap-1.5 transition-opacity duration-200",
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
                aria-label="Upload company logo"
              >
                <Upload className="size-3.5" />
              </button>
              {isCustomLogo ? (
                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={isPending}
                  className="flex size-8 items-center justify-center rounded-full bg-white/95 text-destructive shadow-md ring-1 ring-black/5 backdrop-blur-sm hover:bg-white disabled:cursor-not-allowed"
                  aria-label="Remove company logo"
                >
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="relative z-10 bg-gradient-to-br from-white via-[#f7f2ff] to-[#d7c6f3] px-6 py-6">
          <p className="break-words text-[1.25rem] font-bold leading-snug tracking-tight text-neutral-950">
            {companyName}
          </p>
          <p className="mt-2 break-words text-[0.92rem] leading-relaxed text-neutral-500">
            {legalName?.trim() || "Company profile"}
          </p>
        </div>
      </div>
    </div>
  );
}
