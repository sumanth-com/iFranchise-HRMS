-- =============================================================================
-- Migration: enable_extensions
-- Description: Enable PostgreSQL extensions required by iFranchise HRMS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA extensions;

COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions including gen_random_uuid()';
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions (uuid_generate_v4)';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram similarity search for text fields';
COMMENT ON EXTENSION "citext" IS 'Case-insensitive character string type';
COMMENT ON EXTENSION "moddatetime" IS 'Automatic timestamp update triggers';
