-- Keep the original uploaded offer letter filename for UI display and email attachments.
ALTER TABLE hrms.recruitment_offers
  ADD COLUMN IF NOT EXISTS offer_letter_filename text;
