"use client";

import { format } from "date-fns";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { QUICK_ACTION_ITEMS } from "@/lib/dashboard/constants";
import type { DashboardPermissions } from "@/types/dashboard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getGreeting(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

type DashboardHeaderProps = {
  userName: string;
  permissions: DashboardPermissions;
};

export function DashboardHeader({ userName, permissions }: DashboardHeaderProps) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const quickActions = QUICK_ACTION_ITEMS.filter((item) => permissions[item.permission]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    if (permissions.employees) {
      router.push(`/dashboard/employees?search=${encodeURIComponent(query)}`);
      return;
    }
    router.push(`/dashboard/attendance?search=${encodeURIComponent(query)}`);
  }

  return (
    <header className="flex flex-col gap-3 border-b bg-card/50 px-1 pb-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
          {getGreeting(now.getHours())}, {userName}
        </h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {format(now, "EEEE, MMMM d, yyyy")} · {format(now, "h:mm a")}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form onSubmit={onSearch} className="relative min-w-[180px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Quick search..."
            className="h-8 pl-8 text-sm"
            aria-label="Quick search"
          />
        </form>

        <NotificationBell />

        {quickActions.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5">
                <Plus className="size-3.5" />
                Quick Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              {quickActions.map((action) => (
                <DropdownMenuItem key={action.key} asChild>
                  <Link href={action.href}>{action.label}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  );
}
