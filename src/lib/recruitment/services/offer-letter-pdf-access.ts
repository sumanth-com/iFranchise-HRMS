import type { AuthSupabaseClient } from "@/lib/auth/profile-loader";
import type { UserProfile } from "@/types/auth";
import {
  contentTypeForOfferLetterExtension,
  downloadOfferLetterFile,
  resolveOfferLetterExtension,
} from "@/lib/recruitment/services/offer-letter-storage";
import { resolveOfferLetterFileName } from "@/lib/recruitment/services/offer-letter-display";
import { fromHrms, unwrapRelation, type PerfRow } from "@/lib/recruitment/services/recruitment-utils";

export async function getOfferLetterFileForOffer(
  supabase: AuthSupabaseClient,
  profile: UserProfile,
  offerId: string,
): Promise<{ fileBytes: Uint8Array; filename: string; contentType: string }> {
  const organizationId = profile.employee.organizationId;

  const { data: offer, error } = await fromHrms(supabase, "recruitment_offers")
    .select(
      `id, offer_letter_path, offer_letter_filename,
      candidate:candidate_id(first_name, last_name),
      job:job_opening_id(title)`,
    )
    .eq("id", offerId)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!offer?.offer_letter_path) throw new Error("Offer letter file not found");

  const candidate = unwrapRelation(offer.candidate as PerfRow | null);
  const job = unwrapRelation(offer.job as PerfRow | null);
  const candidateName = candidate
    ? [candidate.first_name, candidate.last_name].filter(Boolean).join(" ")
    : "Candidate";
  const position = job?.title ?? "Role";
  const ext = resolveOfferLetterExtension(offer.offer_letter_path);
  const filename = resolveOfferLetterFileName({
    storedFileName: offer.offer_letter_filename,
    offerLetterPath: offer.offer_letter_path,
    candidateName,
    jobTitle: position,
  });

  const fileBytes = await downloadOfferLetterFile(supabase, offer.offer_letter_path);

  return {
    fileBytes,
    filename,
    contentType: contentTypeForOfferLetterExtension(ext),
  };
}
