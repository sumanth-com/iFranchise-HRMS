-- Replace dotted/macron I characters with a plain Latin i in stored names.

CREATE OR REPLACE FUNCTION hrms.plain_latin_i(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT replace(replace(replace(replace(COALESCE(input, ''), 'İ', 'i'), 'Ī', 'i'), 'ı', 'i'), 'ī', 'i');
$$;

UPDATE hrms.employees
SET
  first_name = hrms.plain_latin_i(first_name),
  last_name = hrms.plain_latin_i(last_name),
  updated_at = public.utc_now()
WHERE first_name ~ '[İĪıī]'
   OR last_name ~ '[İĪıī]';

UPDATE hrms.employee_invitations
SET
  full_name = hrms.plain_latin_i(full_name),
  updated_at = public.utc_now()
WHERE full_name ~ '[İĪıī]';
