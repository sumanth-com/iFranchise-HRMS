-- Offer letter content for recruitment emails
ALTER TABLE hrms.recruitment_offers
  ADD COLUMN IF NOT EXISTS offer_letter_body text,
  ADD COLUMN IF NOT EXISTS email_subject text,
  ADD COLUMN IF NOT EXISTS offer_template_id text;
