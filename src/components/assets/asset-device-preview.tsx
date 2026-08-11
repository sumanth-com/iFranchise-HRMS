"use client";

import Image from "next/image";

import { AssetDeviceVisual } from "@/components/assets/asset-device-visual";
import { assetCategoryIcon } from "@/components/employee/assets/employee-asset-icons";
import { resolveAssetDeviceType } from "@/lib/assets/asset-device-images";
import { cn } from "@/lib/utils";

type PreviewSize = "sm" | "md" | "lg" | "xl";

type Props = {
  categoryName?: string | null;
  brand?: string | null;
  model?: string | null;
  name?: string | null;
  imageUrl?: string | null;
  size?: PreviewSize;
  className?: string;
};

function framedContainerClass(size: PreviewSize) {
  if (size === "xl") {
    return "aspect-[5/3] min-h-[13rem] rounded-xl border border-border/70 bg-gradient-to-b from-background via-background to-muted/25";
  }
  return "aspect-[4/3] min-h-[8.5rem] rounded-lg border border-border/60 bg-gradient-to-b from-background to-muted/20";
}

function framedImageClass(size: PreviewSize) {
  return cn(
    "absolute inset-0 h-full w-full object-contain object-center drop-shadow-lg",
    size === "xl" ? "p-2 scale-[1.18]" : "p-1.5 scale-[1.2]",
  );
}

export function AssetDevicePreview({
  categoryName,
  brand,
  model,
  name,
  imageUrl,
  size = "sm",
  className,
}: Props) {
  const deviceType = resolveAssetDeviceType({ categoryName, brand, model, name });
  const framed = size === "md" || size === "xl";
  const large = size === "lg" || size === "xl";
  const Icon = assetCategoryIcon(categoryName ?? null);

  if (imageUrl) {
    if (framed) {
      return (
        <div className={cn("w-full", className)}>
          <div className={cn("relative w-full overflow-hidden", framedContainerClass(size))}>
            <Image
              src={imageUrl}
              alt={name ?? "Asset"}
              width={size === "xl" ? 560 : 208}
              height={size === "xl" ? 336 : 156}
              className={framedImageClass(size)}
              unoptimized
            />
          </div>
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex w-full items-center justify-center",
          large ? "h-52" : "h-28",
          className,
        )}
      >
        <Image
          src={imageUrl}
          alt={name ?? "Asset"}
          width={large ? 320 : 200}
          height={large ? 200 : 112}
          className={cn(
            "object-contain",
            large ? "max-h-48 max-w-full" : "max-h-24 max-w-full",
          )}
          unoptimized
        />
      </div>
    );
  }

  if (deviceType) {
    return <AssetDeviceVisual type={deviceType} size={size} className={className} />;
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center",
        framed ? "aspect-[4/3] min-h-[8.5rem] w-full rounded-lg border border-dashed bg-muted/10" : "",
        large ? "h-52" : "h-28",
        className,
      )}
    >
      <Icon
        className={cn(
          framed ? "size-14" : large ? "size-16" : "size-12",
          "text-muted-foreground/70",
        )}
      />
    </div>
  );
}
