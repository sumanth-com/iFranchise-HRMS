-- =============================================================================
-- Migration: create_schemas
-- Description: Application namespaces for future HRMS module development
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS hrms;

COMMENT ON SCHEMA hrms IS
  'Namespace for iFranchise HRMS application tables. Populated by future module migrations.';

GRANT USAGE ON SCHEMA hrms TO postgres, anon, authenticated, service_role;
