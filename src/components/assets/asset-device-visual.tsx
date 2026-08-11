"use client";

import Image from "next/image";

import type { HrAssignAssetTypeKey } from "@/lib/assets/constants";
import { getCatalogDeviceImage } from "@/lib/assets/asset-device-images";
import { cn } from "@/lib/utils";

type Props = {
  type: HrAssignAssetTypeKey;
  selected?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const SIZE_CLASS = {
  sm: "h-14",
  lg: "h-52",
} as const;

const IMAGE_CLASS = {
  sm: "max-h-[90%] max-w-[88%]",
  lg: "max-h-[82%] max-w-[72%]",
} as const;

/** Static preview using images from `src/assets/`. */
export function AssetDeviceVisual({ type, selected, size = "sm", className }: Props) {
  const large = size === "lg" || size === "xl";
  const { src, label } = getCatalogDeviceImage(type);

  if (size === "xl" || size === "md") {
    const framed = size === "xl";
    return (
      <div className={cn("w-full", className)}>
        <div
          className={cn(
            "relative w-full overflow-hidden",
            framed
              ? "aspect-[5/3] min-h-[13rem] rounded-xl border border-border/70 bg-gradient-to-b from-background via-background to-muted/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
              : "aspect-[4/3] min-h-[8.5rem] rounded-lg border border-border/60 bg-gradient-to-b from-background to-muted/20",
          )}
        >
          <Image
            src={src}
            alt={label}
            width={src.width}
            height={src.height}
            quality={95}
            className={cn(
              "absolute inset-0 h-full w-full object-contain object-center",
              framed ? "p-2 scale-[1.18]" : "p-1.5 scale-[1.2]",
              "drop-shadow-lg transition-transform duration-200",
              selected && (framed ? "scale-[1.24]" : "scale-[1.26]"),
            )}
            priority={framed}
            sizes={framed ? "(min-width: 1024px) 560px, 100vw" : "208px"}
          />
        </div>
      </div>
    );
  }

  const visualSize = size === "lg" ? "lg" : "sm";

  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center",
        SIZE_CLASS[visualSize],
        className,
      )}
    >
      <Image
        src={src}
        alt={label}
        width={src.width}
        height={src.height}
        quality={95}
        className={cn(
          "object-contain drop-shadow-md transition-transform duration-200",
          IMAGE_CLASS[visualSize],
          selected && "scale-[1.03]",
        )}
        priority={large}
        sizes={large ? "480px" : "128px"}
      />
    </div>
  );
}
