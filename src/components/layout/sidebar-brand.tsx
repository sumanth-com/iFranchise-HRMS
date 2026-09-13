"use client";

import { AppNavLink as Link } from "@/components/layout/app-nav-link";
import { BrandLockup, BrandMarkTile } from "@/components/brand/brand-logo";
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
  return (
    <Link
      href={href}
      prefetch
      onClick={onNavigate}
      className={cn("group/brand flex min-w-0 items-center", className)}
      aria-label="iFranchise"
    >
      {collapsed ? (
        <BrandMarkTile size={36} priority />
      ) : (
        <BrandLockup markSize={40} priority className="max-w-full" />
      )}
    </Link>
  );
}

export function OrganizationBrandTitle() {
  const { profile } = useAuth();
  return <span className="truncate">{profile.organization.name}</span>;
}
