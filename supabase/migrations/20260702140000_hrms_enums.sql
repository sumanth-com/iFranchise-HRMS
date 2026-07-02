-- =============================================================================
-- Migration: hrms_enums
-- Description: PostgreSQL enums for iFranchise HRMS domain model
-- =============================================================================

CREATE TYPE hrms.record_status AS ENUM (
  'active',
  'inactive',
  'archived'
);

CREATE TYPE hrms.employment_status AS ENUM (
  'draft',
  'probation',
  'active',
  'on_leave',
  'suspended',
  'terminated',
  'resigned'
);

CREATE TYPE hrms.attendance_status AS ENUM (
  'present',
  'absent',
  'half_day',
  'late',
  'on_leave',
  'holiday',
  'week_off'
);

CREATE TYPE hrms.correction_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

CREATE TYPE hrms.leave_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'withdrawn'
);

CREATE TYPE hrms.payroll_status AS ENUM (
  'draft',
  'processing',
  'processed',
  'approved',
  'paid',
  'cancelled'
);

CREATE TYPE hrms.document_status AS ENUM (
  'pending',
  'verified',
  'rejected',
  'expired'
);

CREATE TYPE hrms.notification_status AS ENUM (
  'unread',
  'read',
  'archived'
);

CREATE TYPE hrms.address_type AS ENUM (
  'current',
  'permanent',
  'work'
);

CREATE TYPE hrms.gender_type AS ENUM (
  'male',
  'female',
  'other',
  'prefer_not_to_say'
);

CREATE TYPE hrms.marital_status AS ENUM (
  'single',
  'married',
  'divorced',
  'widowed',
  'other'
);

CREATE TYPE hrms.bank_account_type AS ENUM (
  'savings',
  'current',
  'salary'
);

CREATE TYPE hrms.approval_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'skipped'
);

CREATE TYPE hrms.audit_operation AS ENUM (
  'INSERT',
  'UPDATE',
  'DELETE'
);
