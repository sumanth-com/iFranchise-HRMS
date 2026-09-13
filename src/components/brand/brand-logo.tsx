"use client";

import Image, { type StaticImageData } from "next/image";
import type { ComponentProps } from "react";

import ifMark from "@/assets/brand/if-mark.png";
import ifMarkRounded from "@/assets/brand/if-mark-rounded.png";
import ifLogoFull from "@/assets/brand/if-logo-horizontal.png";
import ifLogoWordmark from "@/assets/brand/if-logo-wordmark.png";
import ifWordmarkTagline from "@/assets/brand/if-wordmark-tagline.png";
import ifWordmarkTaglineLight from "@/assets/brand/if-wordmark-tagline-light.png";
import ifWordmark from "@/assets/brand/if-wordmark.png";
import ifWordmarkLight from "@/assets/brand/if-wordmark-light.png";
import { BRAND_NAME, BRAND_PURPLE, BRAND_TAGLINE } from "@/lib/brand/constants";
import { cn } from "@/lib/utils";

export type BrandLogoVariant =
  | "mark"
  | "markRounded"
  | "full"
  | "wordmark"
  | "wordmarkTagline"
  | "wordmarkTaglineLight"
  | "name"
  | "nameLight";

const VARIANT_SRC: Record<BrandLogoVariant, StaticImageData> = {
  mark: ifMark,
  markRounded: ifMarkRounded,
  full: ifLogoFull,
  wordmark: ifLogoWordmark,
  wordmarkTagline: ifWordmarkTagline,
  wordmarkTaglineLight: ifWordmarkTaglineLight,
  name: ifWordmark,
  nameLight: ifWordmarkLight,
};

type Props = {
  variant?: BrandLogoVariant;
  /** Pixel height hint for Next/Image; width follows intrinsic aspect. */
  height?: number;
  width?: number;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  alt?: string;
} & Omit<ComponentProps<"span">, "children">;

/**
 * Renders official iFranchise brand artwork.
 * Always uses object-contain — never crop/stretch the provided mark or lockups.
 */
export function BrandLogo({
  variant = "mark",
  height,
  width,
  priority = false,
  className,
  imgClassName,
  alt = BRAND_NAME,
  ...rest
}: Props) {
  const src = VARIANT_SRC[variant];
  const intrinsicW = src.width;
  const intrinsicH = src.height;
  const resolvedHeight = height ?? (variant === "mark" || variant === "markRounded" ? 40 : 44);
  const resolvedWidth =
    width ?? Math.round((resolvedHeight * intrinsicW) / intrinsicH);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-visible",
        className,
      )}
      style={{
        width: `${resolvedWidth}px`,
        height: `${resolvedHeight}px`,
      }}
      suppressHydrationWarning
      {...rest}
    >
      <Image
        src={src}
        alt={alt}
        width={resolvedWidth}
        height={resolvedHeight}
        priority={priority}
        className={cn("size-full object-contain object-left", imgClassName)}
        sizes={`${resolvedWidth}px`}
      />
    </span>
  );
}

/**
 * IF mark tile — keeps the free internal padding from the source asset.
 * Rounded squircle via CSS only; never zoom/crop with object-cover or scale.
 */
export function BrandMarkTile({
  size = 40,
  className,
  imgClassName,
  shine = false,
  priority = false,
}: {
  size?: number;
  className?: string;
  imgClassName?: string;
  /** Preserve auth traveling gleam on the logo tile. */
  shine?: boolean;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-[22%] bg-[#3016B0]",
        shine && "auth-logo-shine",
        className,
      )}
      style={{ width: `${size}px`, height: `${size}px` }}
      suppressHydrationWarning
    >
      <Image
        src={ifMark}
        alt={BRAND_NAME}
        width={size}
        height={size}
        priority={priority}
        className={cn(
          /* contain + slight inset keeps the free padding look (not zoomed) */
          "relative z-0 size-[92%] object-contain",
          imgClassName,
        )}
      />
    </span>
  );
}

/**
 * Reference lockup: free IF mark + bold aligned wordmark/tagline.
 * Purple text in light mode; white text in dark mode.
 */
export function BrandLockup({
  markSize = 40,
  shine = false,
  priority = false,
  className,
  compact = false,
  /** Force white wordmark (auth glass / dark surfaces even in light theme). */
  onDarkSurface = false,
}: {
  markSize?: number;
  shine?: boolean;
  priority?: boolean;
  className?: string;
  compact?: boolean;
  onDarkSurface?: boolean;
}) {
  const nameClass = onDarkSurface
    ? "text-white"
    : "text-[#3016B0] dark:text-white";
  const tagClass = onDarkSurface
    ? "text-white/80"
    : "text-[#3016B0]/80 dark:text-white/75";

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      <BrandMarkTile size={markSize} shine={shine} priority={priority} />
      <span className="min-w-0 leading-none">
        <span
          className={cn(
            "block truncate font-black tracking-[-0.03em]",
            nameClass,
            markSize >= 52
              ? "text-[1.55rem]"
              : markSize >= 48
                ? "text-[1.4rem]"
                : markSize >= 40
                  ? "text-[1.125rem]"
                  : "text-[1rem]",
          )}
        >
          {BRAND_NAME}
        </span>
        {!compact ? (
          <span
            className={cn(
              "mt-1.5 block truncate font-bold uppercase tracking-[0.2em]",
              tagClass,
              markSize >= 52 ? "text-[0.68rem]" : markSize >= 48 ? "text-[0.64rem]" : "text-[0.58rem]",
            )}
          >
            {BRAND_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  );
}
