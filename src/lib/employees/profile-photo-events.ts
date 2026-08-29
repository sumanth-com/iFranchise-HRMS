/** Lightweight client bus so ID-card uploads can update the header avatar immediately. */

export const PROFILE_PHOTO_CHANGED_EVENT = "hrms:profile-photo-changed";

export type ProfilePhotoChangedDetail = {
  employeeId: string;
  imageUrl: string | null;
};

export function notifyProfilePhotoChanged(detail: ProfilePhotoChangedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<ProfilePhotoChangedDetail>(PROFILE_PHOTO_CHANGED_EVENT, {
      detail,
    }),
  );
}

export function subscribeProfilePhotoChanged(
  listener: (detail: ProfilePhotoChangedDetail) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const custom = event as CustomEvent<ProfilePhotoChangedDetail>;
    if (!custom.detail) return;
    listener(custom.detail);
  };

  window.addEventListener(PROFILE_PHOTO_CHANGED_EVENT, handler);
  return () => window.removeEventListener(PROFILE_PHOTO_CHANGED_EVENT, handler);
}
