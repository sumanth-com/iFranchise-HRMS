"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getDirectoryAssetPhoto } from "@/lib/employee/directory-asset-photos";
import { getSignedUrlAction } from "@/lib/employees/actions";
import { subscribeProfilePhotoChanged } from "@/lib/employees/profile-photo-events";
import type { CeoProvisioningUser } from "@/types/ceo-user-provisioning";
import { cn } from "@/lib/utils";

export function ProvisioningCardAvatar({
  user,
  className,
}: {
  user: CeoProvisioningUser;
  className?: string;
}) {
  const assetPhoto = getDirectoryAssetPhoto({
    employeeCode: user.employeeCode,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: user.fullName,
  });
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [assetFailed, setAssetFailed] = useState(false);
  const [remoteFailed, setRemoteFailed] = useState(false);

  useEffect(() => {
    setAssetFailed(false);
    setRemoteFailed(false);

    if (!user.profileImagePath) {
      setResolvedUrl(null);
      return;
    }

    let cancelled = false;
    void getSignedUrlAction("profileImages", user.profileImagePath).then((result) => {
      if (!cancelled && result.success) {
        setResolvedUrl(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user.profileImagePath]);

  useEffect(() => {
    return subscribeProfilePhotoChanged((detail) => {
      if (detail.employeeId !== user.employeeId) return;
      setRemoteFailed(false);
      setResolvedUrl(detail.imageUrl);
    });
  }, [user.employeeId]);

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const showUpload = Boolean(resolvedUrl) && !remoteFailed;
  const showAsset = Boolean(assetPhoto) && !assetFailed && !showUpload;

  if (showAsset && assetPhoto) {
    return (
      <div
        className={cn(
          "relative size-12 shrink-0 overflow-hidden rounded-full ring-2 ring-background",
          className,
        )}
      >
        <Image
          src={assetPhoto}
          alt={user.fullName}
          fill
          sizes="48px"
          className="object-cover object-top"
          onError={() => setAssetFailed(true)}
        />
      </div>
    );
  }

  return (
    <Avatar className={cn("ring-2 ring-background", className)}>
      {showUpload && resolvedUrl ? (
        <AvatarImage
          src={resolvedUrl}
          alt={user.fullName}
          onError={() => setRemoteFailed(true)}
        />
      ) : null}
      <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
    </Avatar>
  );
}
