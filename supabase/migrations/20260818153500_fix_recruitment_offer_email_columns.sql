-- Ensure offer-email fields exist for sending offer letters with
-- subject, message body, and uploaded attachment metadata.

ALTER TABLE hrms.recruitment_offers
  ADD COLUMN IF NOT EXISTS offer_letter_body text,
  ADD COLUMN IF NOT EXISTS email_subject text,
  ADD COLUMN IF NOT EXISTS offer_template_id text;

-- Refresh PostgREST schema cache so the new/confirmed columns are
-- immediately visible to API queries after this migration runs.
NOTIFY pgrst, 'reload schema';
