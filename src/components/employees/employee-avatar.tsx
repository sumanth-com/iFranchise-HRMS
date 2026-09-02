"use client";

import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSignedUrlAction } from "@/lib/employees/actions";
import { subscribeProfilePhotoChanged } from "@/lib/employees/profile-photo-events";

type EmployeeAvatarProps = {
  firstName: string;
  lastName: string;
  employeeId?: string;
  profileImagePath?: string | null;
  signedUrl?: string | null;
  className?: string;
};

export function EmployeeAvatar({
  firstName,
  lastName,
  employeeId,
  profileImagePath,
  signedUrl,
  className,
}: EmployeeAvatarProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(signedUrl ?? null);

  useEffect(() => {
    if (signedUrl) {
      setImageUrl(signedUrl);
      return;
    }

    if (!profileImagePath) {
      setImageUrl(null);
      return;
    }

    void getSignedUrlAction("profileImages", profileImagePath).then((result) => {
      if (result.success) {
        setImageUrl(result.data);
      }
    });
  }, [profileImagePath, signedUrl]);

  useEffect(() => {
    if (!employeeId) return;
    return subscribeProfilePhotoChanged((detail) => {
      if (detail.employeeId !== employeeId) return;
      setImageUrl(detail.imageUrl);
    });
  }, [employeeId]);

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <Avatar className={className}>
      {imageUrl ? <AvatarImage src={imageUrl} alt={`${firstName} ${lastName}`} /> : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
