import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";

const BUCKET = "employee-documents";

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
  rtf: "application/rtf",
  odt: "application/vnd.oasis.opendocument.text",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  zip: "application/zip",
};

export function resolveOfferLetterExtension(filename: string): string {
  const raw = filename.split(".").pop()?.toLowerCase() ?? "";
  const cleaned = raw.replace(/[^a-z0-9]/g, "");
  return cleaned || "bin";
}

export function contentTypeForOfferLetterExtension(ext: string): string {
  return EXTENSION_CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export async function storeOfferLetterFile(
  supabase: AuthSupabaseClient,
  organizationId: string,
  offerId: string,
  candidateId: string,
  fileBytes: Uint8Array,
  filename: string,
): Promise<string> {
  const ext = resolveOfferLetterExtension(filename);
  const storagePath = `recruitment/offers/${organizationId}/${candidateId}/${offerId}.${ext}`;
  const contentType = contentTypeForOfferLetterExtension(ext);

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, fileBytes, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(
      uploadError.message.includes("size")
        ? "Offer letter must be 10 MB or smaller"
        : `Failed to upload offer letter: ${uploadError.message}`,
    );
  }

  return storagePath;
}

export async function downloadOfferLetterFile(
  supabase: AuthSupabaseClient,
  storagePath: string,
): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error) throw new Error(error.message);
  return new Uint8Array(await data.arrayBuffer());
}
