"use client";

import { useEffect } from "react";

import { useAuth } from "@/providers/auth-provider";

/** Applies one signed header photo URL. Renders nothing. */
export function ShellProfileAvatarHydrator({
  employeeId,
  imageUrl,
}: {
  employeeId: string;
  imageUrl: string;
}) {
  const { applyShellProfileImageUrl } = useAuth();

  useEffect(() => {
    applyShellProfileImageUrl(employeeId, imageUrl);
  }, [applyShellProfileImageUrl, employeeId, imageUrl]);

  return null;
}
