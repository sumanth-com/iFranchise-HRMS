-- Prevent self-manager assignment when seeded employee is the super admin.

CREATE OR REPLACE FUNCTION hrms.seed_ifranchise_employees()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = hrms, public, auth
AS $$
DECLARE
  v_org_id uuid := 'a0000000-0000-4000-8000-000000000001'::uuid;
  v_branch_id uuid := 'a0000000-0000-4000-8000-000000000002'::uuid;
  v_dept_hr uuid := 'a0000000-0000-4000-8000-000000000202'::uuid;
  v_dept_sales uuid := 'a0000000-0000-4000-8000-000000000203'::uuid;
  v_dept_marketing uuid := 'a0000000-0000-4000-8000-000000000204'::uuid;
  v_dept_tech uuid := 'a0000000-0000-4000-8000-000000000206'::uuid;
  v_emp_full_time uuid := 'a0000000-0000-4000-8000-000000000401'::uuid;
  v_emp_intern uuid := 'a0000000-0000-4000-8000-000000000411'::uuid;
  v_leave_el uuid := 'b0000000-0000-4000-8000-000000000501'::uuid;
  v_doc_aadhaar uuid := 'b0000000-0000-4000-8000-000000000601'::uuid;
  v_doc_pan uuid := 'b0000000-0000-4000-8000-000000000602'::uuid;
  v_manager_id uuid;
  v_hr_lead_id uuid;
  v_reporting_manager_id uuid;
  v_effective_id uuid;
  v_rec record;
  v_status hrms.employment_status;
  v_basic numeric(12, 2);
  v_hra numeric(12, 2);
  v_transport numeric(12, 2);
  v_gross numeric(12, 2);
  v_auth_results jsonb := '[]'::jsonb;
  v_count int := 0;
BEGIN
  IF NOT hrms.is_master_data_seeded() THEN
    RAISE EXCEPTION 'Master data is not seeded. Apply foundation migrations first.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT e.id INTO v_manager_id
  FROM hrms.employees e
  INNER JOIN hrms.user_roles ur ON ur.employee_id = e.id
  INNER JOIN hrms.roles r ON r.id = ur.role_id
  WHERE e.organization_id = v_org_id AND r.code = 'super_admin'
    AND e.deleted_at IS NULL AND ur.deleted_at IS NULL
  ORDER BY e.created_at LIMIT 1;

  FOR v_rec IN
    SELECT * FROM (VALUES
      ('e1000000-0000-4000-8000-000000000001'::uuid, 'IF2026001', 'Ekta', 'Pattanaik', 'ekta@ifranchise.in', '9337213031', 'b0000000-0000-4000-8000-000000000314'::uuid, v_dept_hr, v_emp_full_time, DATE '2026-01-17', DATE '2026-04-17', DATE '2000-04-12', '252633984995', 'FTSPP1164A', 3::numeric, false, NULL::text, 'female'::hrms.gender_type),
      ('e1000000-0000-4000-8000-000000000002'::uuid, 'IF2025002', 'Om Anil', 'Ramtekkar', 'om.ramtekkar@ifranchise.in', '8600357983', 'b0000000-0000-4000-8000-000000000315'::uuid, v_dept_sales, v_emp_full_time, DATE '2025-12-01', DATE '2026-03-01', DATE '2003-03-13', '305096506368', 'FGAPR0436N', 4::numeric, false, NULL::text, 'male'::hrms.gender_type),
      ('e1000000-0000-4000-8000-000000000003'::uuid, 'IF2026002', 'Himani', 'Bhargava Tapadiya', 'himani.bhargava@ifranchise.in', '9711763264', 'b0000000-0000-4000-8000-000000000315'::uuid, v_dept_sales, v_emp_full_time, DATE '2026-02-02', DATE '2026-05-02', DATE '1993-06-07', '281441560826', 'BZHPB1546B', 3::numeric, false, NULL::text, 'female'::hrms.gender_type),
      ('e1000000-0000-4000-8000-000000000004'::uuid, 'IF2026008', 'Mohammed Fazil', 'Arfath', 'fazil.arfath@ifranchise.in', '9066249066', 'b0000000-0000-4000-8000-000000000316'::uuid, v_dept_marketing, v_emp_full_time, DATE '2026-03-23', DATE '2026-06-23', DATE '1997-06-17', '280605423396', 'CKUPA1965N', 0::numeric, false, NULL::text, 'male'::hrms.gender_type),
      ('e1000000-0000-4000-8000-000000000005'::uuid, 'IF2026010', 'Swetha', 'Chintada', 'swetha.chintada@ifranchise.in', '9398102839', 'b0000000-0000-4000-8000-000000000317'::uuid, v_dept_sales, v_emp_full_time, DATE '2026-05-18', DATE '2026-08-13', DATE '2001-01-09', '732112120734', 'BXDPC0280M', 0::numeric, false, NULL::text, 'female'::hrms.gender_type),
      ('e1000000-0000-4000-8000-000000000006'::uuid, 'IF2026011', 'Dikhsha', 'Choudhary', 'dikhsha.choudhary@ifranchise.in', '7014519378', 'b0000000-0000-4000-8000-000000000317'::uuid, v_dept_sales, v_emp_full_time, DATE '2026-05-18', DATE '2026-08-13', DATE '1998-09-08', '613320910808', 'CHCPC8778G', 0::numeric, false, NULL::text, 'female'::hrms.gender_type),
      ('e1000000-0000-4000-8000-000000000007'::uuid, 'IF2026009', 'Gangaram Sumanth', 'Reddy', 'sumanth.reddy@ifranchise.in', '8074241025', 'b0000000-0000-4000-8000-000000000318'::uuid, v_dept_tech, v_emp_intern, DATE '2026-04-13', DATE '2026-10-13', DATE '2004-04-15', '693369969925', 'GNZPR5003L', 0::numeric, true, NULL::text, 'male'::hrms.gender_type),
      ('e1000000-0000-4000-8000-000000000008'::uuid, 'IF2026012', 'Akshita', 'Potnuru', 'akshitapotnuru@gmail.com', '7337430010', 'b0000000-0000-4000-8000-000000000319'::uuid, v_dept_hr, v_emp_intern, DATE '2026-05-04', DATE '2026-08-04', DATE '2000-12-14', '648319238827', 'DHXPA4553B', 0::numeric, true, 'IF2026001', 'female'::hrms.gender_type),
      ('e1000000-0000-4000-8000-000000000009'::uuid, 'IF2026014', 'Sneha', 'Mahajan', 'sneha.mahajan@ifranchise.in', '7876213113', 'b0000000-0000-4000-8000-000000000320'::uuid, v_dept_marketing, v_emp_intern, DATE '2026-07-01', DATE '2027-01-01', DATE '2004-01-28', '633323539518', 'HOUPM1412P', 0::numeric, true, NULL::text, 'female'::hrms.gender_type),
      ('e1000000-0000-4000-8000-000000000010'::uuid, 'IF2026015', 'Prajjwal', 'Negi', 'prajwal.negii@ifranchise.in', '9528917733', 'b0000000-0000-4000-8000-000000000320'::uuid, v_dept_marketing, v_emp_intern, DATE '2026-07-01', DATE '2027-01-01', DATE '2005-02-04', '514740925697', 'DISPN0537E', 0::numeric, true, NULL::text, 'male'::hrms.gender_type)
    ) AS t(employee_id, employee_code, first_name, last_name, email, phone, designation_id, department_id, employment_type_id, date_of_joining, probation_end, date_of_birth, aadhaar_number, pan_number, earned_leave, is_intern, manager_code, gender)
  LOOP
    v_effective_id := v_rec.employee_id;
    SELECT e.id INTO v_effective_id FROM hrms.employees e
    WHERE e.organization_id = v_org_id AND e.employee_code = v_rec.employee_code AND e.deleted_at IS NULL LIMIT 1;
    IF NOT FOUND THEN
      v_effective_id := NULL;
      SELECT e.id INTO v_effective_id FROM hrms.employees e
      WHERE e.organization_id = v_org_id AND e.email = lower(v_rec.email) AND e.deleted_at IS NULL LIMIT 1;
    END IF;
    v_effective_id := COALESCE(v_effective_id, v_rec.employee_id);

    SELECT e.id INTO v_hr_lead_id FROM hrms.employees e
    WHERE e.organization_id = v_org_id AND e.employee_code = 'IF2026001' AND e.deleted_at IS NULL LIMIT 1;

    v_reporting_manager_id := CASE WHEN v_rec.manager_code = 'IF2026001' THEN v_hr_lead_id ELSE v_manager_id END;
    IF v_reporting_manager_id = v_effective_id THEN v_reporting_manager_id := NULL; END IF;

    v_status := CASE
      WHEN CURRENT_DATE < v_rec.date_of_joining THEN 'draft'::hrms.employment_status
      WHEN CURRENT_DATE <= v_rec.probation_end THEN 'probation'::hrms.employment_status
      ELSE 'active'::hrms.employment_status END;
    IF v_rec.is_intern THEN v_basic := 12000; v_hra := 0; v_transport := 1500;
    ELSE v_basic := 30000; v_hra := 12000; v_transport := 2000; END IF;
    v_gross := v_basic + v_hra + v_transport;

    INSERT INTO hrms.employees (id, organization_id, branch_id, department_id, designation_id, employment_type_id, reporting_manager_id, employee_code, first_name, last_name, email, phone, employment_status, date_of_joining, status)
    VALUES (v_effective_id, v_org_id, v_branch_id, v_rec.department_id, v_rec.designation_id, v_rec.employment_type_id, v_reporting_manager_id, v_rec.employee_code, v_rec.first_name, v_rec.last_name, lower(v_rec.email), v_rec.phone, v_status, v_rec.date_of_joining, 'active')
    ON CONFLICT (id) DO UPDATE SET branch_id = EXCLUDED.branch_id, department_id = EXCLUDED.department_id, designation_id = EXCLUDED.designation_id, employment_type_id = EXCLUDED.employment_type_id, reporting_manager_id = EXCLUDED.reporting_manager_id, employee_code = EXCLUDED.employee_code, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone, employment_status = EXCLUDED.employment_status, date_of_joining = EXCLUDED.date_of_joining, status = EXCLUDED.status, updated_at = public.utc_now(), deleted_at = NULL;

    INSERT INTO hrms.employee_profiles (employee_id, date_of_birth, gender, marital_status, nationality, blood_group, personal_email, personal_phone, bio, status)
    VALUES (v_effective_id, v_rec.date_of_birth, v_rec.gender, 'single', 'Indian', 'O+', lower(v_rec.email), v_rec.phone, 'iFranchise team member onboarded via workforce seed.', 'active')
    ON CONFLICT (employee_id) DO UPDATE SET date_of_birth = EXCLUDED.date_of_birth, gender = EXCLUDED.gender, marital_status = EXCLUDED.marital_status, nationality = EXCLUDED.nationality, blood_group = EXCLUDED.blood_group, personal_email = EXCLUDED.personal_email, personal_phone = EXCLUDED.personal_phone, bio = EXCLUDED.bio, updated_at = public.utc_now(), deleted_at = NULL;

    UPDATE hrms.employee_addresses SET deleted_at = public.utc_now() WHERE employee_id = v_effective_id AND deleted_at IS NULL;
    INSERT INTO hrms.employee_addresses (employee_id, address_type, address_line1, address_line2, city, state, postal_code, country, is_primary, status) VALUES
      (v_effective_id, 'current', 'iFranchise Head Office, Hitech City', 'Madhapur', 'Hyderabad', 'Telangana', '500081', 'IN', true, 'active'),
      (v_effective_id, 'permanent', 'Residence address on file', NULL, 'Hyderabad', 'Telangana', '500081', 'IN', true, 'active');

    UPDATE hrms.emergency_contacts SET deleted_at = public.utc_now() WHERE employee_id = v_effective_id AND deleted_at IS NULL;
    INSERT INTO hrms.emergency_contacts (employee_id, name, relationship, phone, email, is_primary, status)
    VALUES (v_effective_id, v_rec.first_name || ' ' || v_rec.last_name || ' - Emergency Contact', 'Family', v_rec.phone, lower(v_rec.email), true, 'active');

    UPDATE hrms.bank_accounts SET deleted_at = public.utc_now() WHERE employee_id = v_effective_id AND deleted_at IS NULL;
    INSERT INTO hrms.bank_accounts (employee_id, bank_name, account_holder_name, account_number, ifsc_code, branch_name, account_type, is_primary, status)
    VALUES (v_effective_id, 'HDFC Bank', v_rec.first_name || ' ' || v_rec.last_name, 'PENDING-' || v_rec.employee_code, 'HDFC0001234', 'Hyderabad - Madhapur', 'salary', true, 'active');

    UPDATE hrms.salary_structures SET deleted_at = public.utc_now() WHERE employee_id = v_effective_id AND deleted_at IS NULL;
    INSERT INTO hrms.salary_structures (employee_id, effective_from, currency_code, basic_salary, hra_amount, transport_allowance, other_allowances, tax_deduction, other_deductions, gross_salary, net_salary, components, status)
    VALUES (v_effective_id, v_rec.date_of_joining, 'INR', v_basic, v_hra, v_transport, 0, 0, 0, v_gross, v_gross, jsonb_build_object('probation_end_date', v_rec.probation_end::text, 'aadhaar_number', v_rec.aadhaar_number, 'pan_number', v_rec.pan_number, 'uan', 'PENDING', 'pf_number', 'PENDING', 'esi_number', 'PENDING'), 'active');

    INSERT INTO hrms.leave_balances (employee_id, leave_type_id, balance_year, allocated_days, used_days, pending_days, balance_days, status)
    VALUES (v_effective_id, v_leave_el, 2026, GREATEST(v_rec.earned_leave, 0), 0, 0, GREATEST(v_rec.earned_leave, 0), 'active')
    ON CONFLICT (employee_id, leave_type_id, balance_year) DO UPDATE SET allocated_days = EXCLUDED.allocated_days, used_days = EXCLUDED.used_days, pending_days = EXCLUDED.pending_days, balance_days = EXCLUDED.balance_days, updated_at = public.utc_now(), deleted_at = NULL;

    UPDATE hrms.employee_documents SET deleted_at = public.utc_now() WHERE employee_id = v_effective_id AND document_type_id IN (v_doc_aadhaar, v_doc_pan) AND deleted_at IS NULL;
    INSERT INTO hrms.employee_documents (employee_id, document_type_id, title, storage_path, file_name, mime_type, file_size_bytes, document_status, status) VALUES
      (v_effective_id, v_doc_aadhaar, 'Aadhaar - ' || v_rec.aadhaar_number, 'seed/' || v_org_id::text || '/' || v_effective_id::text || '/aadhaar-reference.txt', 'aadhaar-' || v_rec.employee_code || '.txt', 'text/plain', 1, 'verified', 'active'),
      (v_effective_id, v_doc_pan, 'PAN - ' || v_rec.pan_number, 'seed/' || v_org_id::text || '/' || v_effective_id::text || '/pan-reference.txt', 'pan-' || v_rec.employee_code || '.txt', 'text/plain', 1, 'verified', 'active');

    DELETE FROM hrms.attendance WHERE employee_id = v_effective_id AND attendance_date >= v_rec.date_of_joining AND attendance_date < CURRENT_DATE;
    INSERT INTO hrms.attendance (organization_id, branch_id, employee_id, attendance_date, check_in_at, check_out_at, attendance_status, work_hours, status)
    SELECT v_org_id, v_branch_id, v_effective_id, day_series::date, day_series + time '09:30:00', day_series + time '18:30:00', 'present', 8, 'active'
    FROM generate_series(v_rec.date_of_joining, CURRENT_DATE - 1, interval '1 day') AS day_series
    WHERE extract(isodow from day_series) < 6 AND v_rec.date_of_joining < CURRENT_DATE;

    IF NOT EXISTS (SELECT 1 FROM hrms.audit_logs al WHERE al.table_name = 'employees' AND al.record_id = v_effective_id::text AND al.new_record ->> 'event' = 'employee_onboarded' AND al.deleted_at IS NULL) THEN
      INSERT INTO hrms.audit_logs (organization_id, schema_name, table_name, record_id, operation, new_record, occurred_at, status)
      VALUES (v_org_id, 'hrms', 'employees', v_effective_id::text, 'INSERT', jsonb_build_object('event', 'employee_onboarded', 'employee_code', v_rec.employee_code, 'full_name', v_rec.first_name || ' ' || v_rec.last_name, 'date_of_joining', v_rec.date_of_joining), v_rec.date_of_joining::timestamptz, 'active');
    END IF;

    v_auth_results := v_auth_results || jsonb_build_array(hrms.link_employee_auth_account(v_effective_id, v_rec.email, v_rec.first_name, v_rec.last_name, v_rec.employee_code, CASE WHEN v_rec.employee_code = 'IF2026001' THEN 'hr_admin' ELSE 'employee' END) || jsonb_build_object('employee_code', v_rec.employee_code));
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('success', true, 'employees_seeded', v_count, 'auth_link_results', v_auth_results);
END;
$$;
