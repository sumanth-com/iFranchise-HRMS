"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNavItems } from "@/config/navigation";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-14 items-center border-b px-4",
          isCollapsed && "justify-center px-2",
        )}
      >
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-xs text-primary-foreground">
            IF
          </span>
          {!isCollapsed ? (
            <span className="truncate text-sm">iFranchise HRMS</span>
          ) : null}
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              aria-disabled={item.disabled}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                item.disabled && "pointer-events-none opacity-50",
                isCollapsed && "justify-center px-2",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!isCollapsed ? <span>{item.title}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
