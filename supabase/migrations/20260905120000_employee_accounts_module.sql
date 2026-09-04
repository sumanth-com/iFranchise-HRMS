-- Employee Accounts: structured identity fields + seed bank/identity data from HR records.

ALTER TABLE hrms.employee_profiles
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS aadhaar_number text;

COMMENT ON COLUMN hrms.employee_profiles.pan_number IS 'Employee PAN — maintained via Team Payroll → Employee Accounts.';
COMMENT ON COLUMN hrms.employee_profiles.aadhaar_number IS 'Employee Aadhaar — maintained via Team Payroll → Employee Accounts.';

DO $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  v_employee_id uuid;
  v_full_name text;
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('IF2026001', '252633984995', 'FTSPP1164A', '2000-04-12'::date, '4550629797', 'KKBK0007329', 'Kotak Mahindra Bank', NULL),
        ('IF2025002', '305096506368', 'FGAPR0436N', '2003-03-13'::date, '4247291962', 'KKBK0001421', 'Kotak Mahindra Bank', NULL),
        ('IF2026002', '281441560826', 'BZHPB1546B', '1993-06-07'::date, '50100144567405', 'HDFC0007642', 'HDFC Bank', NULL),
        ('IF2026010', '732112120734', 'BXDPC0280M', '2001-01-09'::date, '922010017199063', 'UTIB0000733', 'Axis Bank', NULL),
        ('IF2026011', '613320910808', 'CHCPC8778G', '1998-09-08'::date, '0247952087', 'KKBK0003547', 'Kotak Mahindra Bank', NULL),
        ('IF2026009', '693369969925', 'GNZPR5003L', '2004-04-15'::date, '41992341026', 'SBIN0000834', 'State Bank of India', NULL),
        ('IF2026012', '648319238827', 'DHXPA4553B', '2000-12-14'::date, '36914028808', 'SBIN0001320', 'State Bank of India', NULL),
        ('IF2026014', '633323539518', 'HOUPM1412P', '2004-01-28'::date, '88061701262961', 'PUNB0HPGB04', 'Himachal Pradesh Gramin Bank', NULL),
        ('IF2026015', '514740925697', 'DISPN0537E', '2005-02-04'::date, '42951757716', 'SBIN0006534', 'State Bank of India', NULL),
        ('IF2026017', '420507121147', 'EPKPA2400H', '2001-06-01'::date, '45096056809', 'SBIN0010180', 'State Bank of India', NULL),
        ('IF2026018', '820384156597', 'FEEPR7234Q', '2000-10-25'::date, '40435632223', 'SBIN0010588', 'State Bank of India', NULL),
        ('IF2026019', '586137656490', 'BLOPH3973H', '2004-06-22'::date, '31372310000514', 'CNRB0013137', 'Canara Bank', NULL),
        ('IF2026020', '928948335730', 'HTVPS4619J', '1998-04-01'::date, '06081000075501', 'PSIB0000706', 'Punjab & Sind Bank', NULL),
        ('IF2026021', '856927110724', 'BQBPG4872J', '1993-12-20'::date, '50100817597132', 'HDFC0000968', 'HDFC Bank', NULL),
        ('IF2026022', '785725596744', 'DIGPA2866F', '2002-05-07'::date, '8811010007233874', 'DBSS0IN0811', 'DBS Bank India', NULL)
    ) AS t(employee_code, aadhaar_number, pan_number, date_of_birth, account_number, ifsc_code, bank_name, branch_name)
  LOOP
    SELECT e.id, trim(e.first_name || ' ' || e.last_name)
      INTO v_employee_id, v_full_name
    FROM hrms.employees e
    WHERE e.organization_id = v_org_id
      AND upper(e.employee_code) = upper(rec.employee_code)
      AND e.deleted_at IS NULL
    LIMIT 1;

    IF v_employee_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO hrms.employee_profiles (
      employee_id,
      date_of_birth,
      pan_number,
      aadhaar_number,
      status
    )
    VALUES (
      v_employee_id,
      rec.date_of_birth,
      rec.pan_number,
      rec.aadhaar_number,
      'active'
    )
    ON CONFLICT (employee_id) DO UPDATE SET
      date_of_birth = COALESCE(EXCLUDED.date_of_birth, hrms.employee_profiles.date_of_birth),
      pan_number = COALESCE(EXCLUDED.pan_number, hrms.employee_profiles.pan_number),
      aadhaar_number = COALESCE(EXCLUDED.aadhaar_number, hrms.employee_profiles.aadhaar_number),
      updated_at = public.utc_now(),
      deleted_at = NULL;

    UPDATE hrms.salary_structures ss
    SET components = COALESCE(ss.components, '{}'::jsonb)
      || jsonb_build_object(
        'pan_number', rec.pan_number,
        'aadhaar_number', rec.aadhaar_number
      ),
      updated_at = public.utc_now()
    WHERE ss.employee_id = v_employee_id
      AND ss.deleted_at IS NULL
      AND ss.status = 'active';

    UPDATE hrms.bank_accounts ba
    SET deleted_at = public.utc_now(), updated_at = public.utc_now()
    WHERE ba.employee_id = v_employee_id
      AND ba.is_primary = true
      AND ba.deleted_at IS NULL
      AND ba.account_number IS DISTINCT FROM rec.account_number;

    INSERT INTO hrms.bank_accounts (
      employee_id,
      bank_name,
      account_holder_name,
      account_number,
      ifsc_code,
      branch_name,
      account_type,
      is_primary,
      status
    )
    SELECT
      v_employee_id,
      rec.bank_name,
      v_full_name,
      rec.account_number,
      rec.ifsc_code,
      rec.branch_name,
      'salary',
      true,
      'active'
    WHERE NOT EXISTS (
      SELECT 1
      FROM hrms.bank_accounts ba
      WHERE ba.employee_id = v_employee_id
        AND ba.is_primary = true
        AND ba.deleted_at IS NULL
        AND ba.account_number = rec.account_number
    );
  END LOOP;
END $$;
