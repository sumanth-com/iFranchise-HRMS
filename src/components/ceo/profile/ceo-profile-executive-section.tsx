"use client";

import { format } from "date-fns";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/common/button";
import { Input } from "@/components/common/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  removeCeoProfileImageAction,
  updateCeoPersonalProfileAction,
  uploadCeoProfileImageAction,
} from "@/lib/ceo/actions/ceo-profile-actions";
import type { CeoExecutiveProfile } from "@/types/ceo-profile";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-background/80 px-3 py-2.5">
      <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium break-words">{value || "—"}</div>
    </div>
  );
}

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

  const initials = profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <section id="profile" className="rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Executive Profile</h2>
          <p className="text-sm text-muted-foreground">
            View your executive identity. Only personal contact details can be edited.
          </p>
        </div>
        <Button type="button" size="sm" disabled={isPending} onClick={savePersonal}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Update Profile
        </Button>
      </div>

      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="size-20 rounded-xl">
          {profile.profileImageUrl ? (
            <AvatarImage src={profile.profileImageUrl} alt={profile.fullName} />
          ) : null}
          <AvatarFallback className="rounded-xl text-lg">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap gap-2">
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
            <Camera className="size-4" />
            Change Photo
          </Button>
          {profile.profileImagePath ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={removePhoto}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Full Name" value={profile.fullName} />
        <Field label="Employee ID" value={profile.employeeCode} />
        <Field label="Role" value={profile.roleName} />
        <Field label="Department" value={profile.departmentName} />
        <Field label="Email" value={profile.email} />
        <Field label="Date of Joining" value={profile.dateOfJoining
          ? format(new Date(profile.dateOfJoining), "dd MMM yyyy")
          : "—"} />
        <Field label="Executive Level" value={profile.executiveLevel} />
        <Field label="Reporting To" value={profile.reportingToName} />
        <Field label="Employment Type" value={profile.employmentTypeName} />
        <Field label="Branch" value={profile.branchName} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Work Phone
          </label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isPending} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Personal Email
          </label>
          <Input
            value={personalEmail}
            onChange={(e) => setPersonalEmail(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Personal Phone
          </label>
          <Input
            value={personalPhone}
            onChange={(e) => setPersonalPhone(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="md:col-span-2 xl:col-span-3">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={isPending}
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:opacity-50"
          />
        </div>
      </div>
    </section>
  );
}
