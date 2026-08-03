import { DEFAULT_DOCUMENT_SETTINGS } from "@/lib/documents/constants";
import { DOCUMENT_MAX_BYTES } from "@/lib/employees/constants";

export const DEFAULT_UPLOAD_MAX_BYTES = DOCUMENT_MAX_BYTES;

export const ONBOARDING_ALLOWED_EXTENSIONS = DEFAULT_DOCUMENT_SETTINGS.allowedFileTypes;

export const ONBOARDING_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
] as const;

export type UploadValidationInput = {
  fileName: string;
  fileSize: number;
  mimeType?: string | null;
  maxBytes?: number;
  allowedExtensions?: readonly string[];
  allowedMimeTypes?: readonly string[];
};

export function extensionFromFileName(fileName: string): string {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts.pop()?.toLowerCase() ?? "";
}

export function validateUploadFile(input: UploadValidationInput): void {
  const maxBytes = input.maxBytes ?? DEFAULT_UPLOAD_MAX_BYTES;
  const allowedExtensions = input.allowedExtensions ?? ONBOARDING_ALLOWED_EXTENSIONS;
  const allowedMimeTypes = input.allowedMimeTypes ?? ONBOARDING_ALLOWED_MIME_TYPES;

  if (input.fileSize <= 0) {
    throw new Error("File is empty");
  }

  if (input.fileSize > maxBytes) {
    const limitMb = Math.floor(maxBytes / (1024 * 1024));
    throw new Error(`File exceeds maximum size of ${limitMb} MB`);
  }

  const extension = extensionFromFileName(input.fileName);
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new Error(`File type .${extension || "unknown"} is not allowed`);
  }

  const mime = (input.mimeType ?? "").trim().toLowerCase();
  if (mime && !allowedMimeTypes.includes(mime as typeof allowedMimeTypes[number])) {
    throw new Error("File MIME type is not allowed");
  }
}

export const MAX_SIGNATURE_DATA_LENGTH = 512 * 1024;
