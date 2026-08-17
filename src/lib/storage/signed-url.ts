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
