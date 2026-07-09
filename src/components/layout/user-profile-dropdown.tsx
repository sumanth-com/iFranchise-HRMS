"use client";

import { Building2, LogOut, Moon, Sun, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  canViewCompanySettings,
  COMPANY_SETTINGS_ROUTES,
} from "@/lib/company-settings/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { useAuth } from "@/providers/auth-provider";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function UserProfileDropdown() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { profile, isLoading, signOut } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const { employee, roles, permissionCodes } = profile;
  const displayName = `${employee.firstName} ${employee.lastName}`;
  const primaryRole = roles[0]?.name ?? "User";
  const profileHref = EMPLOYEE_ROUTES.detail(employee);
  const canOpenCompanySettings = canViewCompanySettings(permissionCodes);

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
              size="icon"
              className="rounded-full"
              aria-label={`${displayName} account menu`}
            >
              <Avatar className="size-8">
                <AvatarFallback>
                  {getInitials(employee.firstName, employee.lastName)}
                </AvatarFallback>
              </Avatar>
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
          <DropdownMenuItem onClick={() => router.push(profileHref)}>
            <User className="size-4" />
            Profile
          </DropdownMenuItem>
          {canOpenCompanySettings ? (
            <DropdownMenuItem onClick={() => router.push(COMPANY_SETTINGS_ROUTES.base)}>
              <Building2 className="size-4" />
              Company Setting
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
            Toggle theme
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
        title="Sign out?"
        description="Are you sure you want to sign out? You will need to sign in again to access your account."
        contentClassName="sm:max-w-md"
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
        <p className="text-sm text-muted-foreground">
          Any unsaved changes in open forms will be lost.
        </p>
      </Modal>
    </>
  );
}
