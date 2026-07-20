"use client";

import {
  Building2,
  ChevronDown,
  CircleHelp,
  LogOut,
  Moon,
  Settings,
  Sun,
  User,
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
import {
  canViewCompanySettings,
  COMPANY_SETTINGS_ROUTES,
} from "@/lib/company-settings/constants";
import { EMPLOYEE_ROUTES } from "@/lib/employees/constants";
import { EMPLOYEE_ROUTES as EMPLOYEE_PORTAL_ROUTES } from "@/lib/employee/constants";
import { CEO_ROUTES } from "@/lib/ceo/constants";
import { MANAGER_ROUTES } from "@/lib/manager/constants";
import { useAuth } from "@/providers/auth-provider";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function UserProfileDropdown() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { profile, isLoading, signOut, portalHome } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const { employee, roles, permissionCodes } = profile;
  const displayName = `${employee.firstName} ${employee.lastName}`;
  const primaryRole = roles[0]?.name ?? "User";
  const isManagerPortal = portalHome.startsWith("/manager");
  const isCeoPortal = portalHome.startsWith("/ceo");
  const isEmployeePortal = portalHome === "/employee" || portalHome.startsWith("/employee/");
  const isDark = resolvedTheme === "dark";
  const profileHref = isManagerPortal
    ? MANAGER_ROUTES.profile
    : isCeoPortal
      ? CEO_ROUTES.profile
      : EMPLOYEE_ROUTES.detail(employee);
  const settingsHref = isManagerPortal
    ? MANAGER_ROUTES.settings
    : isCeoPortal
      ? `${CEO_ROUTES.profile}#preferences`
      : null;
  const helpHref = isEmployeePortal ? EMPLOYEE_PORTAL_ROUTES.help : null;
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
          {!isEmployeePortal ? (
            <DropdownMenuItem onClick={() => router.push(profileHref)}>
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
          ) : null}
          {helpHref ? (
            <DropdownMenuItem onClick={() => router.push(helpHref)}>
              <CircleHelp className="size-4" />
              Help
            </DropdownMenuItem>
          ) : null}
          {settingsHref ? (
            <DropdownMenuItem onClick={() => router.push(settingsHref)}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
          ) : null}
          {canOpenCompanySettings ? (
            <DropdownMenuItem onClick={() => router.push(COMPANY_SETTINGS_ROUTES.base)}>
              <Building2 className="size-4" />
              Company Setting
            </DropdownMenuItem>
          ) : null}
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
