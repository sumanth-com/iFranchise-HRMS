-- Seed 2026 company holidays from the iFranchise leave policy

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001';
BEGIN
  UPDATE hrms.holidays
  SET
    deleted_at = public.utc_now(),
    updated_at = public.utc_now()
  WHERE organization_id = v_org_id
    AND holiday_date >= DATE '2026-01-01'
    AND holiday_date <= DATE '2026-12-31'
    AND deleted_at IS NULL;

  INSERT INTO hrms.holidays (
    id,
    organization_id,
    name,
    holiday_date,
    holiday_type,
    is_optional,
    status
  )
  VALUES
    ('c0000000-0000-4000-8000-000000000601', v_org_id, 'New Year', DATE '2026-01-01', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-000000000602', v_org_id, 'Makara Sankranti', DATE '2026-01-15', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-000000000603', v_org_id, 'Republic Day', DATE '2026-01-26', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-000000000604', v_org_id, 'Maha Sivaratri', DATE '2026-02-15', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-000000000605', v_org_id, 'Ugadi', DATE '2026-03-19', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-000000000606', v_org_id, 'Eid-ul-Fitr (Ramzan)', DATE '2026-03-20', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-000000000607', v_org_id, 'May Day (Labour''s Day)', DATE '2026-05-01', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-000000000608', v_org_id, 'Independence Day', DATE '2026-08-15', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-000000000609', v_org_id, 'Vinayaka Chavithi', DATE '2026-09-14', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-00000000060a', v_org_id, 'Mahatma Gandhi Jayanthy', DATE '2026-10-02', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-00000000060b', v_org_id, 'Dusshera', DATE '2026-10-20', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-00000000060c', v_org_id, 'Deepavali', DATE '2026-11-08', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-00000000060d', v_org_id, 'Christmas', DATE '2026-12-25', 'national', false, 'active'),
    ('c0000000-0000-4000-8000-000000000621', v_org_id, 'Holi', DATE '2026-03-03', 'company', true, 'active'),
    ('c0000000-0000-4000-8000-000000000622', v_org_id, 'Srirama Navami', DATE '2026-03-27', 'company', true, 'active'),
    ('c0000000-0000-4000-8000-000000000623', v_org_id, 'Good Friday', DATE '2026-04-03', 'company', true, 'active'),
    ('c0000000-0000-4000-8000-000000000624', v_org_id, 'Eid-ul-Adha (Bakrid)', DATE '2026-05-27', 'company', true, 'active'),
    ('c0000000-0000-4000-8000-000000000625', v_org_id, 'Moharrum (Shahadat Imam Hussain RA, 1447 Hijri)', DATE '2026-06-25', 'company', true, 'active'),
    ('c0000000-0000-4000-8000-000000000626', v_org_id, 'Sri Krishnaashtami', DATE '2026-09-04', 'company', true, 'active')
  ON CONFLICT (id) DO UPDATE
  SET
    organization_id = EXCLUDED.organization_id,
    name = EXCLUDED.name,
    holiday_date = EXCLUDED.holiday_date,
    holiday_type = EXCLUDED.holiday_type,
    is_optional = EXCLUDED.is_optional,
    status = EXCLUDED.status,
    deleted_at = NULL,
    updated_at = public.utc_now();
END $$;
