"use client";

import { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSignedUrlAction } from "@/lib/employees/actions";

type EmployeeAvatarProps = {
  firstName: string;
  lastName: string;
  profileImagePath?: string | null;
  signedUrl?: string | null;
  className?: string;
};

export function EmployeeAvatar({
  firstName,
  lastName,
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

  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return (
    <Avatar className={className}>
      {imageUrl ? <AvatarImage src={imageUrl} alt={`${firstName} ${lastName}`} /> : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
