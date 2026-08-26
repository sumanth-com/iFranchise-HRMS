/** Pure offer-letter filename helpers — safe for client bundles. */

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
