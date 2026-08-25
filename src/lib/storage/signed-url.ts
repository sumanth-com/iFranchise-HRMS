import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

export async function createSignedStorageUrl(
  supabase: AuthSupabaseClient,
  bucket: string,
  path: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 60 * 60);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

/**
 * Sign many storage paths in one server-side batch (native batch API when available,
 * otherwise parallel single signs). Returns path → signed URL for successes only.
 */
export async function createSignedStorageUrls(
  supabase: AuthSupabaseClient,
  bucket: string,
  paths: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const result = new Map<string, string>();
  if (unique.length === 0) return result;

  const storage = supabase.storage.from(bucket) as {
    createSignedUrls?: (
      paths: string[],
      expiresIn: number,
    ) => Promise<{
      data: Array<{ path?: string; signedUrl?: string } | null> | null;
      error: { message?: string } | null;
    }>;
  };

  if (typeof storage.createSignedUrls === "function") {
    const { data, error } = await storage.createSignedUrls(unique, 60 * 60);
    if (!error && data) {
      for (let index = 0; index < data.length; index += 1) {
        const entry = data[index];
        const path = entry?.path ?? unique[index];
        if (path && entry?.signedUrl) {
          result.set(path, entry.signedUrl);
        }
      }
      if (result.size > 0) return result;
    }
  }

  await Promise.all(
    unique.map(async (path) => {
      const url = await createSignedStorageUrl(supabase, bucket, path);
      if (url) result.set(path, url);
    }),
  );

  return result;
}
