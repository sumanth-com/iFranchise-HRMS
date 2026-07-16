"use client";

import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import {
  removeCeoProfileImageAction,
  updateCeoPersonalProfileAction,
  uploadCeoProfileImageAction,
} from "@/lib/ceo/actions/ceo-profile-actions";
import type { CeoExecutiveProfile } from "@/types/ceo-profile";

export function CeoProfileExecutiveSection({
  profile,
  onUpdated,
}: {
  profile: CeoExecutiveProfile;
  onUpdated: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [personalEmail, setPersonalEmail] = useState(profile.personalEmail ?? "");
  const [personalPhone, setPersonalPhone] = useState(profile.personalPhone ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [isPending, startTransition] = useTransition();

  function savePersonal() {
    startTransition(async () => {
      const result = await updateCeoPersonalProfileAction({
        phone,
        personalEmail,
        personalPhone,
        bio,
      });
      if (result.success) {
        toast.success(result.message);
        onUpdated();
      } else {
        toast.error(result.message);
      }
    });
  }

  function onPhotoSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    startTransition(async () => {
      const result = await uploadCeoProfileImageAction(formData);
      if (result.success) {
        toast.success(result.message);
        onUpdated();
      } else {
        toast.error(result.message);
      }
    });
  }

  function removePhoto() {
    startTransition(async () => {
      const result = await removeCeoProfileImageAction();
      if (result.success) {
        toast.success(result.message);
        onUpdated();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <section id="profile" className="rounded-xl border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Contact details</h2>
          <p className="text-xs text-muted-foreground">
            Update how leadership can reach you. Role and org details stay on your ID card.
          </p>
        </div>
        <Button type="button" size="sm" disabled={isPending} onClick={savePersonal}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Save contact
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPhotoSelected}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="size-3.5" />
          Change photo
        </Button>
        {profile.profileImagePath ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={removePhoto}
          >
            <Trash2 className="size-3.5" />
            Remove photo
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Work phone
          </label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={isPending}
            placeholder="Office number"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Personal phone
          </label>
          <Input
            value={personalPhone}
            onChange={(e) => setPersonalPhone(e.target.value)}
            disabled={isPending}
            placeholder="Mobile number"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Personal email
          </label>
          <Input
            value={personalEmail}
            onChange={(e) => setPersonalEmail(e.target.value)}
            disabled={isPending}
            placeholder="Alternate email"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Short bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={isPending}
            rows={3}
            placeholder="Optional note for your executive profile"
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
          />
        </div>
      </div>
    </section>
  );
}
