import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type SidebarNavIconProps = {
  icon: LucideIcon;
  active?: boolean;
  className?: string;
};

export function SidebarNavIcon({ icon: Icon, active, className }: SidebarNavIconProps) {
  return (
    <span
      className={cn(
        "sidebar-nav-icon inline-flex shrink-0 items-center justify-center",
        active && "sidebar-nav-icon-active",
        className,
      )}
      aria-hidden
    >
      <Icon className="size-4" strokeWidth={active ? 2.25 : 2} />
    </span>
  );
}
