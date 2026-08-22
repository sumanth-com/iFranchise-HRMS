import { createAdminClient } from "@/lib/supabase/admin";
import {
  contentTypeForOfferLetterExtension,
  downloadOfferLetterFile,
  resolveOfferLetterExtension,
} from "@/lib/recruitment/services/offer-letter-storage";
import { resolveOfferLetterFileName } from "@/lib/recruitment/services/offer-letter-display";
import type { CandidatePortalOfferLetter } from "@/types/onboarding";

type OfferLetterRow = {
  offer_letter_path: string;
  offer_letter_filename: string | null;
  sent_at: string | null;
  updated_at: string;
};

function mapOfferLetterRow(row: OfferLetterRow): CandidatePortalOfferLetter {
  const ext = resolveOfferLetterExtension(row.offer_letter_path);
  const fileName =
    row.offer_letter_filename?.trim() ||
    resolveOfferLetterFileName({
      storedFileName: row.offer_letter_filename,
      offerLetterPath: row.offer_letter_path,
      candidateName: "Candidate",
      jobTitle: "Offer",
    });

  return {
    fileName,
    uploadedAt: row.sent_at ?? row.updated_at ?? null,
    contentType: contentTypeForOfferLetterExtension(ext),
  };
}

export async function loadCandidateOfferLetter(
  organizationId: string,
  offerReferenceNumber: string | null,
  personalEmail: string,
): Promise<(CandidatePortalOfferLetter & { storagePath: string }) | null> {
  const admin = createAdminClient();

  if (offerReferenceNumber) {
    const { data } = await admin
      .schema("hrms")
      .from("recruitment_offers")
      .select("offer_letter_path, offer_letter_filename, sent_at, updated_at")
      .eq("organization_id", organizationId)
      .eq("offer_code", offerReferenceNumber)
      .not("offer_letter_path", "is", null)
      .is("deleted_at", null)
      .maybeSingle();

    if (data?.offer_letter_path) {
      return { ...mapOfferLetterRow(data as OfferLetterRow), storagePath: data.offer_letter_path };
    }
  }

  const email = personalEmail.trim().toLowerCase();
  if (!email) return null;

  const { data: candidate } = await admin
    .schema("hrms")
    .from("recruitment_candidates")
    .select("id")
    .eq("organization_id", organizationId)
    .ilike("email", email)
    .is("deleted_at", null)
    .maybeSingle();

  if (!candidate?.id) return null;

  const { data: offer } = await admin
    .schema("hrms")
    .from("recruitment_offers")
    .select("offer_letter_path, offer_letter_filename, sent_at, updated_at")
    .eq("organization_id", organizationId)
    .eq("candidate_id", candidate.id)
    .not("offer_letter_path", "is", null)
    .is("deleted_at", null)
    .in("offer_status", ["sent", "accepted"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!offer?.offer_letter_path) return null;

  return { ...mapOfferLetterRow(offer as OfferLetterRow), storagePath: offer.offer_letter_path };
}

export async function getCandidateOfferLetterFile(
  organizationId: string,
  offerReferenceNumber: string | null,
  personalEmail: string,
): Promise<{ fileBytes: Uint8Array; fileName: string; contentType: string } | null> {
  const offer = await loadCandidateOfferLetter(organizationId, offerReferenceNumber, personalEmail);
  if (!offer) return null;

  const admin = createAdminClient();
  const fileBytes = await downloadOfferLetterFile(admin, offer.storagePath);

  return {
    fileBytes,
    fileName: offer.fileName,
    contentType: offer.contentType,
  };
}
