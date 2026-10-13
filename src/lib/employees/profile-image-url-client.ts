"use client";

import { getSignedProfileImageUrlsAction } from "@/lib/employees/actions";
import { subscribeProfilePhotoChanged } from "@/lib/employees/profile-photo-events";

/**
 * Avatar grids used to fire one `getSignedUrlAction` per card. Server actions run
 * one at a time in the App Router queue, and a navigation that interrupts a pending
 * action forces an extra full refresh of the next page. Requests made in the same
 * tick are sent as one batch, and results are reused for a short time.
 */

/** Uploads overwrite `profile.{ext}` in place, so a reused URL must not live long. */
const SIGNED_URL_TTL_MS = 10 * 60 * 1000;
/** Lets users without `employee.view` fall back to initials without retrying per card. */
const FAILED_TTL_MS = 2 * 60 * 1000;

type CacheEntry = { url: string | null; expiresAt: number };

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string | null>>();
let queued: Array<{ path: string; resolve: (url: string | null) => void }> = [];
let flushScheduled = false;
let unsubscribePhotoChanges: (() => void) | null = null;

function ensurePhotoChangeListener() {
  if (unsubscribePhotoChanges || typeof window === "undefined") return;
  unsubscribePhotoChanges = subscribeProfilePhotoChanged(() => {
    cache.clear();
  });
}

async function flush() {
  flushScheduled = false;
  const batch = queued;
  queued = [];
  if (batch.length === 0) return;

  const paths = [...new Set(batch.map((item) => item.path))];
  let signed: Record<string, string> | null = null;
  try {
    const result = await getSignedProfileImageUrlsAction(paths);
    if (result.success) signed = result.data;
  } catch {
    signed = null;
  }

  const now = Date.now();
  for (const path of paths) {
    const url = signed?.[path] ?? null;
    cache.set(path, {
      url,
      expiresAt: now + (url ? SIGNED_URL_TTL_MS : FAILED_TTL_MS),
    });
    inFlight.delete(path);
  }
  for (const item of batch) {
    item.resolve(signed?.[item.path] ?? null);
  }
}

/** Signed URL for a profile photo storage path, or null (caller keeps its fallback). */
export function getSignedProfileImageUrl(path: string): Promise<string | null> {
  ensurePhotoChangeListener();

  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.url);
  }

  const pending = inFlight.get(path);
  if (pending) return pending;

  const promise = new Promise<string | null>((resolve) => {
    queued.push({ path, resolve });
    if (!flushScheduled) {
      flushScheduled = true;
      setTimeout(() => void flush(), 0);
    }
  });
  inFlight.set(path, promise);
  return promise;
}

/** Synchronous cache read so remounted avatars paint the photo without a blank frame. */
export function peekSignedProfileImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const cached = cache.get(path);
  return cached && cached.expiresAt > Date.now() ? cached.url : null;
}
