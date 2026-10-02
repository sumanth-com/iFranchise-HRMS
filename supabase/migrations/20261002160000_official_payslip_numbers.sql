-- Official payslip number is PS-YYYYMM-EMPLOYEECODE.
-- Storage paths and payroll amounts stay unchanged.

WITH desired AS (
  SELECT
    ps.id,
    ps.payslip_number AS current_number,
    'PS-' || to_char(p.payroll_month, 'YYYYMM') || '-' ||
      upper(regexp_replace(e.employee_code, '[^A-Za-z0-9]', '', 'g')) AS official_number
  FROM hrms.payslips ps
  JOIN hrms.payrolls p ON p.id = ps.payroll_id
  JOIN hrms.employees e ON e.id = ps.employee_id
  WHERE ps.deleted_at IS NULL
    AND e.employee_code IS NOT NULL
    AND btrim(e.employee_code) <> ''
    AND p.payroll_month IS NOT NULL
)
UPDATE hrms.payslips ps
SET
  payslip_number = d.official_number,
  updated_at = public.utc_now()
FROM desired d
WHERE ps.id = d.id
  AND ps.payslip_number IS DISTINCT FROM d.official_number
  AND NOT EXISTS (
    SELECT 1
    FROM hrms.payslips other
    WHERE other.deleted_at IS NULL
      AND other.id <> ps.id
      AND other.payslip_number = d.official_number
  );

WITH desired AS (
  SELECT
    ps.id,
    'PS-' || to_char(p.payroll_month, 'YYYYMM') || '-' ||
      upper(regexp_replace(e.employee_code, '[^A-Za-z0-9]', '', 'g')) AS official_number
  FROM hrms.payslips ps
  JOIN hrms.payrolls p ON p.id = ps.payroll_id
  JOIN hrms.employees e ON e.id = ps.employee_id
  WHERE e.employee_code IS NOT NULL
    AND btrim(e.employee_code) <> ''
    AND p.payroll_month IS NOT NULL
)
UPDATE hrms.payslip_versions v
SET payslip_number = d.official_number
FROM desired d
WHERE v.payslip_id = d.id
  AND v.payslip_number IS DISTINCT FROM d.official_number;

WITH desired AS (
  SELECT
    ps.id,
    'PS-' || to_char(p.payroll_month, 'YYYYMM') || '-' ||
      upper(regexp_replace(e.employee_code, '[^A-Za-z0-9]', '', 'g')) AS official_number
  FROM hrms.payslips ps
  JOIN hrms.payrolls p ON p.id = ps.payroll_id
  JOIN hrms.employees e ON e.id = ps.employee_id
  WHERE e.employee_code IS NOT NULL
    AND btrim(e.employee_code) <> ''
    AND p.payroll_month IS NOT NULL
)
UPDATE hrms.employee_documents ed
SET
  document_number = d.official_number,
  file_name = d.official_number || '.pdf',
  updated_at = public.utc_now()
FROM desired d
WHERE ed.deleted_at IS NULL
  AND ed.notes ILIKE '%payslip_id:' || d.id::text || '%'
  AND ed.document_number IS DISTINCT FROM d.official_number;
