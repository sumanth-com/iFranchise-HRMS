"use client";

import Image from "next/image";
import { AppNavLink as Link } from "@/components/layout/app-nav-link";

import { DEFAULT_BRAND_LOGO_PATH } from "@/lib/brand/constants";
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
  const brandLogoSrc = organization.logoUrl ?? DEFAULT_BRAND_LOGO_PATH;

  return (
    <Link
      href={href}
      prefetch
      onClick={onNavigate}
      className={cn("group/brand flex items-center gap-2 font-semibold", className)}
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/5 ring-1 ring-border",
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
