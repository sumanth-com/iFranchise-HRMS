-- =============================================================================
-- Migration: system_api_management
-- Description: Versioned public API keys, usage logs, webhooks, and settings
-- =============================================================================

ALTER TABLE hrms.system_api_keys
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production',
  ADD COLUMN IF NOT EXISTS scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rate_limit_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS rate_limit_per_minute integer,
  ADD COLUMN IF NOT EXISTS rotated_from_id uuid REFERENCES hrms.system_api_keys (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL;

ALTER TABLE hrms.system_api_keys
  DROP CONSTRAINT IF EXISTS system_api_keys_environment_check;

ALTER TABLE hrms.system_api_keys
  ADD CONSTRAINT system_api_keys_environment_check
  CHECK (environment IN ('production', 'sandbox'));

ALTER TABLE hrms.system_api_keys
  DROP CONSTRAINT IF EXISTS system_api_keys_rate_limit_tier_check;

ALTER TABLE hrms.system_api_keys
  ADD CONSTRAINT system_api_keys_rate_limit_tier_check
  CHECK (rate_limit_tier IN ('standard', 'high_volume', 'custom'));

ALTER TABLE hrms.system_api_keys
  DROP CONSTRAINT IF EXISTS system_api_keys_status_check;

ALTER TABLE hrms.system_api_keys
  ADD CONSTRAINT system_api_keys_status_check
  CHECK (status IN ('active', 'revoked'));

CREATE UNIQUE INDEX IF NOT EXISTS system_api_keys_hash_uidx
  ON hrms.system_api_keys (key_hash)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS system_api_keys_prefix_idx
  ON hrms.system_api_keys (organization_id, key_prefix)
  WHERE deleted_at IS NULL;

-- Map legacy coarse permissions into least-privilege read scopes.
UPDATE hrms.system_api_keys
SET scopes = CASE
  WHEN jsonb_typeof(permissions) = 'array'
       AND permissions ? 'admin' THEN
    '["employees:read","departments:read","attendance:read","leave:read","payroll:read","assets:read","performance:read","system:read","system:write"]'::jsonb
  WHEN jsonb_typeof(permissions) = 'array'
       AND permissions ? 'write' THEN
    '["employees:read","departments:read","attendance:read","leave:read","assets:read","performance:read"]'::jsonb
  ELSE
    '["employees:read","departments:read","attendance:read","leave:read"]'::jsonb
END
WHERE deleted_at IS NULL
  AND (scopes IS NULL OR scopes = '[]'::jsonb);

ALTER TABLE hrms.system_settings
  ADD COLUMN IF NOT EXISTS api_config jsonb NOT NULL DEFAULT jsonb_build_object(
    'enabled', true,
    'currentVersion', 'v1',
    'defaultRateLimitPerMinute', 60,
    'allowedEnvironments', jsonb_build_array('production', 'sandbox'),
    'webhooksEnabled', true
  );

CREATE TABLE IF NOT EXISTS hrms.system_api_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES hrms.system_api_keys (id) ON DELETE SET NULL,
  request_id text NOT NULL,
  method text NOT NULL,
  path text NOT NULL,
  status_code integer NOT NULL,
  response_time_ms integer,
  ip_address text,
  user_agent text,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT public.utc_now()
);

CREATE INDEX IF NOT EXISTS system_api_usage_logs_org_created_idx
  ON hrms.system_api_usage_logs (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS system_api_usage_logs_key_created_idx
  ON hrms.system_api_usage_logs (api_key_id, created_at DESC);

CREATE INDEX IF NOT EXISTS system_api_usage_logs_request_id_idx
  ON hrms.system_api_usage_logs (request_id);

CREATE INDEX IF NOT EXISTS system_api_usage_logs_status_idx
  ON hrms.system_api_usage_logs (organization_id, status_code, created_at DESC);

CREATE TABLE IF NOT EXISTS hrms.system_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  name text NOT NULL,
  endpoint_url text NOT NULL,
  events jsonb NOT NULL DEFAULT '[]'::jsonb,
  secret_prefix text NOT NULL,
  secret_hash text NOT NULL,
  secret_encrypted text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_delivery_at timestamptz,
  last_delivery_status text,
  failure_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  deleted_at timestamptz,
  CONSTRAINT system_webhooks_url_https CHECK (
    endpoint_url ~* '^https://'
    OR endpoint_url ~* '^http://(localhost|127\.0\.0\.1)(:[0-9]+)?'
  )
);

CREATE INDEX IF NOT EXISTS system_webhooks_org_idx
  ON hrms.system_webhooks (organization_id)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS hrms.system_webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE CASCADE,
  webhook_id uuid NOT NULL REFERENCES hrms.system_webhooks (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  request_id text NOT NULL,
  payload_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  response_status integer,
  error_message text,
  attempt_count integer NOT NULL DEFAULT 1,
  delivery_status text NOT NULL DEFAULT 'pending'
    CHECK (delivery_status IN ('pending', 'success', 'failed', 'skipped')),
  next_retry_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS system_webhook_deliveries_webhook_idx
  ON hrms.system_webhook_deliveries (webhook_id, created_at DESC);

CREATE INDEX IF NOT EXISTS system_webhook_deliveries_org_idx
  ON hrms.system_webhook_deliveries (organization_id, created_at DESC);

ALTER TABLE hrms.system_api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.system_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.system_webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_api_usage_logs_select_policy ON hrms.system_api_usage_logs;
CREATE POLICY system_api_usage_logs_select_policy ON hrms.system_api_usage_logs
  FOR SELECT TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND hrms.user_has_permission('system.api_keys.manage')
  );

DROP POLICY IF EXISTS system_webhooks_policy ON hrms.system_webhooks;
CREATE POLICY system_webhooks_policy ON hrms.system_webhooks
  FOR ALL TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('system.api_keys.manage')
      OR hrms.user_has_permission('system.integrations.view')
    )
  )
  WITH CHECK (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('system.api_keys.manage')
      OR hrms.user_has_permission('system.integrations.view')
    )
  );

DROP POLICY IF EXISTS system_webhook_deliveries_select_policy ON hrms.system_webhook_deliveries;
CREATE POLICY system_webhook_deliveries_select_policy ON hrms.system_webhook_deliveries
  FOR SELECT TO authenticated
  USING (
    hrms.user_belongs_to_organization(organization_id)
    AND (
      hrms.user_has_permission('system.api_keys.manage')
      OR hrms.user_has_permission('system.integrations.view')
    )
  );

CREATE OR REPLACE FUNCTION hrms.record_system_api_key_usage(
  p_key_id uuid,
  p_ip text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, hrms
AS $$
BEGIN
  UPDATE hrms.system_api_keys
  SET
    usage_count = usage_count + 1,
    last_used_at = public.utc_now(),
    last_used_ip = p_ip,
    updated_at = public.utc_now()
  WHERE id = p_key_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION hrms.record_system_api_key_usage(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hrms.record_system_api_key_usage(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION hrms.record_system_api_key_usage(uuid, text) TO authenticated;

COMMENT ON TABLE hrms.system_api_usage_logs IS
  'Public API request metadata. Never store Authorization headers or raw API secrets.';

COMMENT ON TABLE hrms.system_webhooks IS
  'Outbound HRMS webhook subscriptions. Signing secrets are stored hashed and encrypted.';
