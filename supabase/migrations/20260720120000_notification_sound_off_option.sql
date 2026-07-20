-- Allow users to disable in-app notification sound.

ALTER TABLE hrms.notification_user_preferences
  DROP CONSTRAINT IF EXISTS notification_user_preferences_sound_check;

ALTER TABLE hrms.notification_user_preferences
  ADD CONSTRAINT notification_user_preferences_sound_check
  CHECK (notification_sound IN ('classic', 'soft', 'alert', 'off'));
