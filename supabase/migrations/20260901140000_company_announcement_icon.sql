-- Announcement visual icon shown next to the title in employee popups.

ALTER TABLE hrms.company_announcement_versions
  ADD COLUMN IF NOT EXISTS icon_key text NOT NULL DEFAULT 'megaphone';

ALTER TABLE hrms.company_announcement_versions
  DROP CONSTRAINT IF EXISTS company_announcement_versions_icon_key_check;

ALTER TABLE hrms.company_announcement_versions
  ADD CONSTRAINT company_announcement_versions_icon_key_check
  CHECK (
    icon_key IN (
      'megaphone',
      'users',
      'building',
      'user',
      'file-text',
      'wallet',
      'shield',
      'calendar',
      'bell',
      'briefcase'
    )
  );
