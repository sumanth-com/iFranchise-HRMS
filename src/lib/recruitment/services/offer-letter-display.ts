import { resolveOfferLetterExtension } from "@/lib/recruitment/services/offer-letter-file-meta";

const UUID_FILE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]+$/i;

function sanitizeFileLabel(value: string): string {
  return value.replace(/[^\w.\s()-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function resolveOfferLetterFileName(input: {
  storedFileName?: string | null;
  offerLetterPath?: string | null;
  candidateName?: string | null;
  jobTitle?: string | null;
}): string {
  const savedName = input.storedFileName?.trim();
  if (savedName) return savedName;

  const basename = input.offerLetterPath?.split("/").pop()?.trim();
  if (basename && !UUID_FILE_PATTERN.test(basename)) {
    return basename;
  }

  const ext = resolveOfferLetterExtension(input.offerLetterPath ?? "offer.pdf");
  const candidate = sanitizeFileLabel(input.candidateName ?? "Candidate") || "Candidate";
  const role = sanitizeFileLabel(input.jobTitle ?? "Offer") || "Offer";
  return `${candidate} - ${role} Offer Letter.${ext}`;
}
