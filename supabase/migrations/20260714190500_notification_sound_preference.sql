-- User-selectable in-app notification sound tone.

ALTER TABLE hrms.notification_user_preferences
  ADD COLUMN IF NOT EXISTS notification_sound text NOT NULL DEFAULT 'classic';

ALTER TABLE hrms.notification_user_preferences
  DROP CONSTRAINT IF EXISTS notification_user_preferences_sound_check;

ALTER TABLE hrms.notification_user_preferences
  ADD CONSTRAINT notification_user_preferences_sound_check
  CHECK (notification_sound IN ('classic', 'soft', 'alert'));
