"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AppNavLink as Link } from "@/components/layout/app-nav-link";

import { DEFAULT_BRAND_LOGO_PATH } from "@/lib/brand/constants";
import { getCurrentOrganizationLogoSignedUrlAction } from "@/lib/organization/actions";
import { useAuth } from "@/providers/auth-provider";
import { cn } from "@/lib/utils";

type SidebarBrandProps = {
  href: string;
  collapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
};

export function SidebarBrand({
  href,
  collapsed = false,
  onNavigate,
  className,
}: SidebarBrandProps) {
  const { profile } = useAuth();
  const organization = profile.organization;
  const displayName = organization.name.trim() || "Company";
  const [brandLogoSrc, setBrandLogoSrc] = useState(
    () => organization.logoUrl ?? DEFAULT_BRAND_LOGO_PATH,
  );

  useEffect(() => {
    if (organization.logoUrl) {
      setBrandLogoSrc(organization.logoUrl);
      return;
    }

    if (!organization.logoStoragePath) {
      setBrandLogoSrc(DEFAULT_BRAND_LOGO_PATH);
      return;
    }

    // Keep fallback immediately (fixed 32×32 slot — no layout shift).
    setBrandLogoSrc(DEFAULT_BRAND_LOGO_PATH);

    let cancelled = false;
    void getCurrentOrganizationLogoSignedUrlAction().then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setBrandLogoSrc(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [organization.logoUrl, organization.logoStoragePath]);

  return (
    <Link
      href={href}
      prefetch
      onClick={onNavigate}
      className={cn("group/brand flex items-center gap-2 font-semibold dark:text-white", className)}
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/5 ring-1 ring-border dark:bg-white/10 dark:ring-white/20",
          collapsed ? "size-8" : "size-8",
        )}
      >
        <Image
          src={brandLogoSrc}
          alt={`${displayName} logo`}
          width={32}
          height={32}
          unoptimized={brandLogoSrc.startsWith("http")}
          className="size-full object-contain p-0.5"
        />
      </span>
      {!collapsed ? (
        <span className="truncate text-sm">{displayName}</span>
      ) : null}
    </Link>
  );
}

export function OrganizationBrandTitle() {
  const { profile } = useAuth();
  return <span className="truncate">{profile.organization.name}</span>;
}
