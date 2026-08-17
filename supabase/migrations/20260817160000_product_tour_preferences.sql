-- Product tour completion / skip state per authenticated user.

ALTER TABLE hrms.user_preferences
  ADD COLUMN IF NOT EXISTS tour_state jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN hrms.user_preferences.tour_state IS
  'Product tour onboarding state keyed by tour id: status (not_started|in_progress|skipped|completed) and updatedAt.';
