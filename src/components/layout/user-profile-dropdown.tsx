"use client";

import { ChevronDown, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/common/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserProfileDropdown() {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="gap-2 px-2">
            <Avatar className="size-8">
              <AvatarFallback>HR</AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-none">HR Admin</p>
              <p className="text-xs text-muted-foreground">admin@example.com</p>
            </div>
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="size-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
        >
          {resolvedTheme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
          Toggle theme
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
