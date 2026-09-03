-- Align 2026 official and optional holidays with the Full-Time Leave, Attendance
-- and Absence Policy annexure. Official holidays are never optional.

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
BEGIN
  UPDATE hrms.holidays
  SET
    is_optional = false,
    holiday_type = 'national',
    name = 'Christmas',
    status = 'active',
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND holiday_date = DATE '2026-12-25'
    AND deleted_at IS NULL;

  UPDATE hrms.holidays
  SET
    is_optional = false,
    holiday_type = 'national',
    name = 'Eid-ul-Adha (Bakrid)',
    status = 'active',
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND holiday_date = DATE '2026-05-27'
    AND deleted_at IS NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM hrms.holidays
    WHERE organization_id = v_org_id
      AND holiday_date = DATE '2026-12-25'
      AND deleted_at IS NULL
  ) THEN
    INSERT INTO hrms.holidays (
      id, organization_id, name, holiday_date, holiday_type, is_optional, status
    ) VALUES (
      'c0000000-0000-4000-8000-00000000060d',
      v_org_id,
      'Christmas',
      DATE '2026-12-25',
      'national',
      false,
      'active'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM hrms.holidays
    WHERE organization_id = v_org_id
      AND holiday_date = DATE '2026-05-27'
      AND deleted_at IS NULL
  ) THEN
    INSERT INTO hrms.holidays (
      id, organization_id, name, holiday_date, holiday_type, is_optional, status
    ) VALUES (
      'c0000000-0000-4000-8000-000000000624',
      v_org_id,
      'Eid-ul-Adha (Bakrid)',
      DATE '2026-05-27',
      'national',
      false,
      'active'
    );
  END IF;

  UPDATE hrms.holidays
  SET
    name = 'Andhra Pradesh Formation Day',
    holiday_type = 'national',
    is_optional = false,
    status = 'active',
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND holiday_date = DATE '2026-11-01'
    AND deleted_at IS NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM hrms.holidays
    WHERE organization_id = v_org_id
      AND holiday_date = DATE '2026-11-01'
      AND deleted_at IS NULL
  ) THEN
    INSERT INTO hrms.holidays (
      id, organization_id, name, holiday_date, holiday_type, is_optional, status
    ) VALUES (
      'c0000000-0000-4000-8000-00000000060e',
      v_org_id,
      'Andhra Pradesh Formation Day',
      DATE '2026-11-01',
      'national',
      false,
      'active'
    );
  END IF;

  UPDATE hrms.holidays
  SET
    is_optional = true,
    holiday_type = 'company',
    status = 'active',
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL
    AND holiday_date IN (
      DATE '2026-03-03',
      DATE '2026-03-27',
      DATE '2026-04-03',
      DATE '2026-06-25',
      DATE '2026-09-04'
    );

  UPDATE hrms.holidays
  SET
    is_optional = false,
    holiday_type = 'national',
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND holiday_date = DATE '2027-01-01'
    AND name = 'New Year'
    AND is_optional = true
    AND deleted_at IS NULL;
END $$;
