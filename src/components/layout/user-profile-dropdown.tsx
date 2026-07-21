"use client";

import {
  ChevronDown,
  CircleHelp,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { SignOutConfirmationContent } from "@/components/layout/sign-out-confirmation-content";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPortalHelpHref } from "@/lib/auth/portal-account-menu";
import { useAuth } from "@/providers/auth-provider";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function UserProfileDropdown() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { profile, isLoading, signOut, portalHome } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const { employee, roles } = profile;
  const displayName = `${employee.firstName} ${employee.lastName}`;
  const primaryRole = roles[0]?.name ?? "User";
  const isDark = resolvedTheme === "dark";
  const helpHref = getPortalHelpHref(portalHome);

  async function handleSignOut() {
    setSignOutOpen(false);
    await signOut();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="h-9 gap-2 rounded-xl px-1.5 pr-2.5"
              aria-label={`${displayName} account menu`}
            >
              <Avatar className="h-8 w-9 rounded-lg after:rounded-lg">
                <AvatarFallback className="rounded-lg bg-neutral-900 text-[0.7rem] font-semibold tracking-wide text-white">
                  {getInitials(employee.firstName, employee.lastName)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">{displayName}</span>
              <span className="text-xs text-muted-foreground">{employee.email}</span>
              <span className="text-xs text-muted-foreground">{primaryRole}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(helpHref)}>
            <CircleHelp className="size-4" />
            Help
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme(isDark ? "light" : "dark")}>
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {isDark ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={isLoading}
            onClick={() => setSignOutOpen(true)}
          >
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title="Confirm sign out"
        description="Review what is saved and what still needs to be saved before ending your session."
        contentClassName="sm:max-w-lg"
        cancelLabel="Stay signed in"
        footer={
          <Button
            variant="destructive"
            disabled={isLoading}
            onClick={() => void handleSignOut()}
          >
            {isLoading ? "Signing out…" : "Sign out"}
          </Button>
        }
      >
        <SignOutConfirmationContent />
      </Modal>
    </>
  );
}
