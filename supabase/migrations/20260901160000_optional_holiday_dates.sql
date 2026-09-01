-- Align Optional Holiday dates with the company list.
-- Christmas 2026 is selectable OH (not a company-wide holiday).
-- New Year 2027 is an OH for calendar year 2027, not 2026 entitlement.

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
BEGIN
  UPDATE hrms.holidays
  SET
    is_optional = true,
    holiday_type = 'company',
    name = 'Christmas',
    status = 'active',
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND holiday_date = DATE '2026-12-25'
    AND deleted_at IS NULL;

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
      DATE '2026-05-27',
      DATE '2026-06-25',
      DATE '2026-09-04'
    );

  IF NOT EXISTS (
    SELECT 1
    FROM hrms.holidays
    WHERE organization_id = v_org_id
      AND holiday_date = DATE '2027-01-01'
      AND name = 'New Year'
      AND deleted_at IS NULL
  ) THEN
    INSERT INTO hrms.holidays (
      id,
      organization_id,
      name,
      holiday_date,
      holiday_type,
      is_optional,
      status
    )
    VALUES (
      'c0000000-0000-4000-8000-000000000627',
      v_org_id,
      'New Year',
      DATE '2027-01-01',
      'company',
      true,
      'active'
    );
  ELSE
    UPDATE hrms.holidays
    SET
      is_optional = true,
      holiday_type = 'company',
      status = 'active',
      updated_at = public.utc_now()
    WHERE organization_id = v_org_id
      AND holiday_date = DATE '2027-01-01'
      AND name = 'New Year'
      AND deleted_at IS NULL;
  END IF;
END $$;
