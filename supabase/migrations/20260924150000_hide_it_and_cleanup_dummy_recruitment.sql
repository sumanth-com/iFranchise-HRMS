-- Soft-delete clearly fabricated recruitment sandbox records (em-dash names,
-- typo email domains, personal-gmail demo candidates, and their demo jobs).
-- Does not touch employees, payroll, attendance, leave, or permissions.

UPDATE hrms.recruitment_interviews i
SET deleted_at = COALESCE(i.deleted_at, public.utc_now())
FROM hrms.recruitment_candidates c
WHERE i.candidate_id = c.id
  AND i.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND (
    COALESCE(c.first_name, '') = ''
    OR COALESCE(c.last_name, '') = ''
    OR c.first_name LIKE '%—%'
    OR c.last_name LIKE '%—%'
    OR c.last_name = '—'
    OR c.first_name = '—'
    OR c.email ~* '@(gmal\.com|gmail\.cpm|gmial\.com)$'
    OR c.email ~* '(codegai|suprabase|ifranchiseemployee|sumanthfolder|hemavathivennapusa2004)'
    OR (
      c.candidate_code ~* '^CAN(D)?-2026-'
      AND c.email ~* '@gmail\.com$'
    )
  );

UPDATE hrms.recruitment_offers o
SET deleted_at = COALESCE(o.deleted_at, public.utc_now())
FROM hrms.recruitment_candidates c
WHERE o.candidate_id = c.id
  AND o.deleted_at IS NULL
  AND c.deleted_at IS NULL
  AND (
    COALESCE(c.first_name, '') = ''
    OR COALESCE(c.last_name, '') = ''
    OR c.first_name LIKE '%—%'
    OR c.last_name LIKE '%—%'
    OR c.last_name = '—'
    OR c.first_name = '—'
    OR c.email ~* '@(gmal\.com|gmail\.cpm|gmial\.com)$'
    OR c.email ~* '(codegai|suprabase|ifranchiseemployee|sumanthfolder|hemavathivennapusa2004)'
    OR (
      c.candidate_code ~* '^CAN(D)?-2026-'
      AND c.email ~* '@gmail\.com$'
    )
  );

UPDATE hrms.recruitment_candidates c
SET deleted_at = COALESCE(c.deleted_at, public.utc_now())
WHERE c.deleted_at IS NULL
  AND (
    COALESCE(c.first_name, '') = ''
    OR COALESCE(c.last_name, '') = ''
    OR c.first_name LIKE '%—%'
    OR c.last_name LIKE '%—%'
    OR c.last_name = '—'
    OR c.first_name = '—'
    OR c.email ~* '@(gmal\.com|gmail\.cpm|gmial\.com)$'
    OR c.email ~* '(codegai|suprabase|ifranchiseemployee|sumanthfolder|hemavathivennapusa2004)'
    OR (
      c.candidate_code ~* '^CAN(D)?-2026-'
      AND c.email ~* '@gmail\.com$'
    )
  );

-- Demo job openings with typo titles / inflated seats / no remaining candidates.
UPDATE hrms.recruitment_job_openings j
SET deleted_at = COALESCE(j.deleted_at, public.utc_now())
WHERE j.deleted_at IS NULL
  AND (
    j.title ~* '(devloper|devoloper)'
    OR COALESCE(j.open_positions, 0) >= 10
    OR NOT EXISTS (
      SELECT 1
      FROM hrms.recruitment_candidates c
      WHERE c.job_opening_id = j.id
        AND c.deleted_at IS NULL
    )
  );
