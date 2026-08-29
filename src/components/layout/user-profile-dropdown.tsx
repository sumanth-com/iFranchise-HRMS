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
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/common/button";
import { Modal } from "@/components/common/modal";
import { SignOutConfirmationContent } from "@/components/layout/sign-out-confirmation-content";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPortalHelpHref } from "@/lib/auth/portal-account-menu";
import { getMyProfileImageUrlAction } from "@/lib/employees/profile-image-actions";
import { subscribeProfilePhotoChanged } from "@/lib/employees/profile-photo-events";
import { useAuth } from "@/providers/auth-provider";

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function canDisplayImageUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
}

export function UserProfileDropdown() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { profile, isLoading, signOut, portalHome } = useAuth();
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [themeReady, setThemeReady] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const avatarRequestIdRef = useRef(0);

  useEffect(() => {
    setThemeReady(true);
  }, []);

  useEffect(() => {
    const requestId = avatarRequestIdRef.current + 1;
    avatarRequestIdRef.current = requestId;
    let cancelled = false;

    void (async () => {
      const result = await getMyProfileImageUrlAction();
      if (cancelled || requestId !== avatarRequestIdRef.current) return;
      if (!result.success || !result.data) {
        setAvatarUrl(null);
        return;
      }

      const canDisplay = await canDisplayImageUrl(result.data);
      if (cancelled || requestId !== avatarRequestIdRef.current) return;
      setAvatarUrl(canDisplay ? result.data : null);
    })();

    return () => {
      cancelled = true;
    };
  }, [profile.employee.id]);

  useEffect(() => {
    return subscribeProfilePhotoChanged((detail) => {
      if (detail.employeeId !== profile.employee.id) return;

      const requestId = avatarRequestIdRef.current + 1;
      avatarRequestIdRef.current = requestId;

      if (!detail.imageUrl) {
        setAvatarUrl(null);
        return;
      }

      void (async () => {
        const canDisplay = await canDisplayImageUrl(detail.imageUrl!);
        if (requestId !== avatarRequestIdRef.current) return;
        setAvatarUrl(canDisplay ? detail.imageUrl : null);
      })();
    });
  }, [profile.employee.id]);

  const { employee, roles } = profile;
  const displayName = `${employee.firstName} ${employee.lastName}`;
  const primaryRole = roles[0]?.name ?? "User";
  const isDark = themeReady && resolvedTheme === "dark";
  const helpHref = getPortalHelpHref(portalHome);
  const showAvatarPhoto = Boolean(avatarUrl);

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
              <Avatar className="size-8 shrink-0 rounded-full after:rounded-full">
                {showAvatarPhoto ? (
                  <AvatarImage
                    src={avatarUrl!}
                    alt={displayName}
                    className="rounded-full object-cover object-center"
                    onError={() => setAvatarUrl(null)}
                  />
                ) : null}
                <AvatarFallback
                  className="rounded-full bg-gradient-to-br from-blue-600 to-violet-600 text-[0.7rem] font-semibold tracking-wide text-white"
                >
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
