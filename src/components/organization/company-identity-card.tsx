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

  const showHoverActions = canEdit && (photoHovered || isPending);

  return (
    <div className={cn("relative mx-auto w-full max-w-[22rem]", className)}>
      <div className="relative flex flex-col overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0b1220] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.65)]">
        <div
          className={cn(
            "relative flex aspect-square items-center justify-center overflow-hidden bg-[#121a2e] p-6",
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
          <div className="relative flex size-full items-center justify-center overflow-hidden rounded-2xl bg-[#1a1030] ring-1 ring-white/10">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`${companyName} logo`}
                className="max-h-full max-w-full object-contain p-4"
              />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-white/15">
                <Camera className="size-7" strokeWidth={1.75} />
              </span>
            )}

            {canEdit ? (
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center bg-black/55 transition-opacity duration-200",
                  showHoverActions ? "opacity-100" : "opacity-0",
                )}
                aria-hidden={!showHoverActions}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openPicker();
                    }}
                    disabled={isPending}
                    className={cn(
                      "inline-flex size-11 items-center justify-center rounded-full",
                      "bg-white text-slate-900 shadow-lg shadow-black/40",
                      "hover:bg-white/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                      "disabled:cursor-not-allowed disabled:opacity-70",
                    )}
                    aria-label={isPending ? "Uploading logo" : "Upload company logo"}
                    title="Upload logo"
                  >
                    <Upload className="size-4" strokeWidth={2} />
                  </button>
                  {isCustomLogo ? (
                    <button
                      type="button"
                      onClick={handleRemove}
                      disabled={isPending}
                      className={cn(
                        "inline-flex size-11 items-center justify-center rounded-full",
                        "bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm",
                        "hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                        "disabled:cursor-not-allowed disabled:opacity-70",
                      )}
                      aria-label="Remove company logo"
                      title="Remove logo"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {canEdit ? (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          ) : null}
        </div>

        <div className="border-t border-white/10 bg-[#0b1220] px-5 py-4">
          <p className="break-words text-base font-semibold leading-snug tracking-tight text-white">
            {companyName}
          </p>
          <p className="mt-1 break-words text-sm leading-relaxed text-slate-400">
            {legalName?.trim() || "Company profile"}
          </p>
        </div>
      </div>
    </div>
  );
}
