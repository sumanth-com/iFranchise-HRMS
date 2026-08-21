"use client";

import { usePathname } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";

import { AppNavLink } from "@/components/layout/app-nav-link";
import { SidebarNavIcon } from "@/components/layout/sidebar-nav-icon";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

type SidebarNavLinkProps = {
  href: string;
  title: string;
  active: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  indented?: boolean;
  icon: ComponentProps<typeof SidebarNavIcon>["icon"];
  onNavigate?: () => void;
  children?: ReactNode;
};

export function SidebarNavLink({
  href,
  title,
  active,
  disabled = false,
  collapsed = false,
  indented = false,
  icon,
  onNavigate,
  children,
}: SidebarNavLinkProps) {
  const pathname = usePathname();
  const { pendingHref, startNavigation } = useSidebar();
  const isPending = pendingHref === href && pathname !== href;

  return (
    <AppNavLink
      href={disabled ? "#" : href}
      prefetch
      aria-disabled={disabled}
      aria-current={active ? "page" : undefined}
      title={collapsed ? title : undefined}
      onClick={() => {
        if (disabled || active) return;
        startNavigation(href);
        onNavigate?.();
      }}
      className={cn(
        "group/nav sidebar-nav-item flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-[color,background-color,box-shadow,opacity] duration-150",
        indented && !collapsed && "ml-2",
        active
          ? "sidebar-nav-active bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        isPending && !active && "bg-sidebar-accent/80 text-sidebar-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        collapsed && "justify-center px-2",
      )}
    >
      <SidebarNavIcon icon={icon} active={active || isPending} />
      {!collapsed ? <span className="truncate">{children ?? title}</span> : null}
    </AppNavLink>
  );
}
