-- Recruitment settings enhancements: codes, archive, interview duration

ALTER TABLE hrms.recruitment_job_openings
  ADD COLUMN IF NOT EXISTS job_code text;

ALTER TABLE hrms.recruitment_candidates
  ADD COLUMN IF NOT EXISTS candidate_code text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS notice_period text;

ALTER TABLE hrms.recruitment_offers
  ADD COLUMN IF NOT EXISTS offer_code text;

ALTER TABLE hrms.recruitment_interviews
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

CREATE UNIQUE INDEX IF NOT EXISTS recruitment_job_openings_job_code_uidx
  ON hrms.recruitment_job_openings (organization_id, job_code)
  WHERE deleted_at IS NULL AND job_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recruitment_candidates_code_uidx
  ON hrms.recruitment_candidates (organization_id, candidate_code)
  WHERE deleted_at IS NULL AND candidate_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS recruitment_offers_code_uidx
  ON hrms.recruitment_offers (organization_id, offer_code)
  WHERE deleted_at IS NULL AND offer_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS recruitment_candidates_archived_idx
  ON hrms.recruitment_candidates (organization_id, archived_at)
  WHERE archived_at IS NOT NULL;

-- Seed enterprise recruitment settings defaults (merge-friendly)
UPDATE hrms.organization_settings os
SET settings = jsonb_set(
  COALESCE(os.settings, '{}'::jsonb),
  '{recruitment}',
  COALESCE(os.settings->'recruitment', '{}'::jsonb) || '{
    "candidateSources": [
      {"id": "linkedin", "label": "LinkedIn", "enabled": true},
      {"id": "naukri", "label": "Naukri", "enabled": true},
      {"id": "indeed", "label": "Indeed", "enabled": true},
      {"id": "career_page", "label": "Company Career Page", "enabled": true},
      {"id": "referral", "label": "Employee Referral", "enabled": true},
      {"id": "walk_in", "label": "Walk-in", "enabled": true},
      {"id": "agency", "label": "Recruitment Agency", "enabled": true},
      {"id": "campus", "label": "Campus Placement", "enabled": true},
      {"id": "other", "label": "Other", "enabled": true}
    ],
    "defaultHiringManagerId": null,
    "defaultInterviewDurationMinutes": 60,
    "noticePeriodOptions": ["Immediate", "15 Days", "30 Days", "45 Days", "60 Days", "90 Days"],
    "autoEmployeeCreation": true,
    "autoArchiveRejectedDays": 90,
    "emailNotifications": {
      "interviewScheduled": true,
      "interviewCancelled": true,
      "offerSent": true,
      "offerAccepted": true,
      "offerRejected": true,
      "joiningReminder": true
    },
    "numberFormats": {
      "candidatePrefix": "CAN",
      "jobPrefix": "JOB",
      "offerPrefix": "OFF"
    }
  }'::jsonb,
  true
)
WHERE os.deleted_at IS NULL;
