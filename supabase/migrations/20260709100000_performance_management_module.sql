-- Phase 6: Enterprise Performance Management System (PMS)

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE hrms.goal_priority AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.goal_status AS ENUM (
    'draft',
    'not_started',
    'in_progress',
    'on_track',
    'at_risk',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.review_cycle_status AS ENUM ('draft', 'active', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.review_stage AS ENUM ('self', 'manager', 'hr', 'final');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.review_status AS ENUM (
    'draft',
    'pending',
    'in_progress',
    'submitted',
    'approved',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.feedback_type AS ENUM ('appreciation', 'suggestion', 'coaching', 'warning');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.feedback_visibility AS ENUM ('public', 'private');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.meeting_status AS ENUM ('scheduled', 'completed', 'cancelled', 'rescheduled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.kpi_period AS ENUM ('monthly', 'quarterly', 'half_yearly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE hrms.promotion_status AS ENUM (
    'draft',
    'pending',
    'recommended',
    'approved',
    'rejected',
    'applied',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- -----------------------------------------------------------------------------
-- Review cycles
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.performance_review_cycles (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  cycle_status hrms.review_cycle_status NOT NULL DEFAULT 'draft',
  is_active boolean NOT NULL DEFAULT false,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT performance_review_cycles_date_range CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS performance_review_cycles_org_idx
  ON hrms.performance_review_cycles (organization_id);
CREATE INDEX IF NOT EXISTS performance_review_cycles_status_idx
  ON hrms.performance_review_cycles (cycle_status);

-- -----------------------------------------------------------------------------
-- Goals & OKRs
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.performance_goals (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  cycle_id uuid REFERENCES hrms.performance_review_cycles (id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  category text,
  goal_priority hrms.goal_priority NOT NULL DEFAULT 'medium',
  weightage numeric(5, 2) NOT NULL DEFAULT 0 CHECK (weightage >= 0 AND weightage <= 100),
  target_value numeric(12, 2),
  current_progress numeric(5, 2) NOT NULL DEFAULT 0 CHECK (current_progress >= 0 AND current_progress <= 100),
  due_date date,
  goal_status hrms.goal_status NOT NULL DEFAULT 'draft',
  attachment_path text,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_goals_org_idx ON hrms.performance_goals (organization_id);
CREATE INDEX IF NOT EXISTS performance_goals_employee_idx ON hrms.performance_goals (employee_id);
CREATE INDEX IF NOT EXISTS performance_goals_cycle_idx ON hrms.performance_goals (cycle_id);
CREATE INDEX IF NOT EXISTS performance_goals_status_idx ON hrms.performance_goals (goal_status);

CREATE TABLE IF NOT EXISTS hrms.performance_goal_milestones (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  goal_id uuid NOT NULL REFERENCES hrms.performance_goals (id) ON DELETE CASCADE,
  title text NOT NULL,
  due_date date,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_goal_milestones_goal_idx
  ON hrms.performance_goal_milestones (goal_id);

CREATE TABLE IF NOT EXISTS hrms.performance_goal_comments (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  goal_id uuid NOT NULL REFERENCES hrms.performance_goals (id) ON DELETE CASCADE,
  author_employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  comment text NOT NULL,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_goal_comments_goal_idx
  ON hrms.performance_goal_comments (goal_id);

-- -----------------------------------------------------------------------------
-- KPI templates & assignments
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.performance_kpi_templates (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  department_id uuid REFERENCES hrms.departments (id) ON DELETE SET NULL,
  designation_id uuid REFERENCES hrms.designations (id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  weightage numeric(5, 2) NOT NULL DEFAULT 0 CHECK (weightage >= 0 AND weightage <= 100),
  kpi_period hrms.kpi_period NOT NULL DEFAULT 'quarterly',
  target_value numeric(12, 2),
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_kpi_templates_org_idx
  ON hrms.performance_kpi_templates (organization_id);

CREATE TABLE IF NOT EXISTS hrms.performance_kpis (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  template_id uuid REFERENCES hrms.performance_kpi_templates (id) ON DELETE SET NULL,
  cycle_id uuid REFERENCES hrms.performance_review_cycles (id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  weightage numeric(5, 2) NOT NULL DEFAULT 0 CHECK (weightage >= 0 AND weightage <= 100),
  target_value numeric(12, 2),
  current_value numeric(12, 2) NOT NULL DEFAULT 0,
  completion_percentage numeric(5, 2) NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  kpi_period hrms.kpi_period NOT NULL DEFAULT 'quarterly',
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_kpis_org_idx ON hrms.performance_kpis (organization_id);
CREATE INDEX IF NOT EXISTS performance_kpis_employee_idx ON hrms.performance_kpis (employee_id);

-- -----------------------------------------------------------------------------
-- Performance reviews
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.performance_reviews (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  cycle_id uuid REFERENCES hrms.performance_review_cycles (id) ON DELETE SET NULL,
  reviewer_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  review_stage hrms.review_stage NOT NULL DEFAULT 'self',
  review_status hrms.review_status NOT NULL DEFAULT 'draft',
  overall_rating smallint CHECK (overall_rating IS NULL OR (overall_rating >= 1 AND overall_rating <= 5)),
  comments text,
  strengths text,
  weaknesses text,
  improvement_plan text,
  submitted_at timestamptz,
  approved_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_reviews_org_idx ON hrms.performance_reviews (organization_id);
CREATE INDEX IF NOT EXISTS performance_reviews_employee_idx ON hrms.performance_reviews (employee_id);
CREATE INDEX IF NOT EXISTS performance_reviews_cycle_idx ON hrms.performance_reviews (cycle_id);
CREATE INDEX IF NOT EXISTS performance_reviews_status_idx ON hrms.performance_reviews (review_status);

CREATE TABLE IF NOT EXISTS hrms.performance_review_approvals (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  review_id uuid NOT NULL REFERENCES hrms.performance_reviews (id) ON DELETE CASCADE,
  approver_employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  approval_level smallint NOT NULL DEFAULT 1 CHECK (approval_level >= 1),
  review_stage hrms.review_stage NOT NULL,
  approval_status hrms.approval_status NOT NULL DEFAULT 'pending',
  comments text,
  acted_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT performance_review_approvals_unique_level UNIQUE (review_id, approval_level)
);

CREATE INDEX IF NOT EXISTS performance_review_approvals_review_idx
  ON hrms.performance_review_approvals (review_id);

-- -----------------------------------------------------------------------------
-- Continuous feedback
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.performance_feedback (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  from_employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  to_employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  feedback_type hrms.feedback_type NOT NULL,
  visibility hrms.feedback_visibility NOT NULL DEFAULT 'private',
  message text NOT NULL,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_feedback_org_idx ON hrms.performance_feedback (organization_id);
CREATE INDEX IF NOT EXISTS performance_feedback_to_idx ON hrms.performance_feedback (to_employee_id);

-- -----------------------------------------------------------------------------
-- One-on-one meetings
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.performance_one_on_ones (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  manager_employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  scheduled_at timestamptz NOT NULL,
  agenda text,
  notes text,
  follow_up_date date,
  meeting_status hrms.meeting_status NOT NULL DEFAULT 'scheduled',
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_one_on_ones_org_idx ON hrms.performance_one_on_ones (organization_id);
CREATE INDEX IF NOT EXISTS performance_one_on_ones_employee_idx ON hrms.performance_one_on_ones (employee_id);

CREATE TABLE IF NOT EXISTS hrms.performance_one_on_one_actions (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  meeting_id uuid NOT NULL REFERENCES hrms.performance_one_on_ones (id) ON DELETE CASCADE,
  title text NOT NULL,
  assigned_to_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  due_date date,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_one_on_one_actions_meeting_idx
  ON hrms.performance_one_on_one_actions (meeting_id);

-- -----------------------------------------------------------------------------
-- Promotion tracker
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS hrms.performance_promotions (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  organization_id uuid NOT NULL REFERENCES hrms.organizations (id) ON DELETE RESTRICT,
  employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  recommended_by_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  current_designation_id uuid REFERENCES hrms.designations (id) ON DELETE SET NULL,
  recommended_designation_id uuid REFERENCES hrms.designations (id) ON DELETE SET NULL,
  current_salary numeric(12, 2),
  recommended_salary numeric(12, 2),
  promotion_status hrms.promotion_status NOT NULL DEFAULT 'draft',
  reason text,
  approver_employee_id uuid REFERENCES hrms.employees (id) ON DELETE SET NULL,
  approved_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS performance_promotions_org_idx ON hrms.performance_promotions (organization_id);
CREATE INDEX IF NOT EXISTS performance_promotions_employee_idx ON hrms.performance_promotions (employee_id);
CREATE INDEX IF NOT EXISTS performance_promotions_status_idx ON hrms.performance_promotions (promotion_status);

CREATE TABLE IF NOT EXISTS hrms.performance_promotion_approvals (
  id uuid PRIMARY KEY DEFAULT public.new_uuid(),
  promotion_id uuid NOT NULL REFERENCES hrms.performance_promotions (id) ON DELETE CASCADE,
  approver_employee_id uuid NOT NULL REFERENCES hrms.employees (id) ON DELETE RESTRICT,
  approval_level smallint NOT NULL DEFAULT 1 CHECK (approval_level >= 1),
  approval_status hrms.approval_status NOT NULL DEFAULT 'pending',
  comments text,
  acted_at timestamptz,
  status hrms.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT public.utc_now(),
  updated_at timestamptz NOT NULL DEFAULT public.utc_now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CONSTRAINT performance_promotion_approvals_unique_level UNIQUE (promotion_id, approval_level)
);

CREATE INDEX IF NOT EXISTS performance_promotion_approvals_promotion_idx
  ON hrms.performance_promotion_approvals (promotion_id);

-- -----------------------------------------------------------------------------
-- Updated_at triggers
-- -----------------------------------------------------------------------------

SELECT public.attach_updated_at_trigger('hrms.performance_review_cycles');
SELECT public.attach_updated_at_trigger('hrms.performance_goals');
SELECT public.attach_updated_at_trigger('hrms.performance_goal_milestones');
SELECT public.attach_updated_at_trigger('hrms.performance_goal_comments');
SELECT public.attach_updated_at_trigger('hrms.performance_kpi_templates');
SELECT public.attach_updated_at_trigger('hrms.performance_kpis');
SELECT public.attach_updated_at_trigger('hrms.performance_reviews');
SELECT public.attach_updated_at_trigger('hrms.performance_review_approvals');
SELECT public.attach_updated_at_trigger('hrms.performance_feedback');
SELECT public.attach_updated_at_trigger('hrms.performance_one_on_ones');
SELECT public.attach_updated_at_trigger('hrms.performance_one_on_one_actions');
SELECT public.attach_updated_at_trigger('hrms.performance_promotions');
SELECT public.attach_updated_at_trigger('hrms.performance_promotion_approvals');

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO hrms.permissions (code, module, action, resource, description, status)
SELECT v.code, v.module, v.action, v.resource, v.description, 'active'::hrms.record_status
FROM (
  VALUES
    ('performance.view', 'performance', 'view', 'performance', 'View performance management'),
    ('performance.create', 'performance', 'create', 'performance', 'Create performance records'),
    ('performance.edit', 'performance', 'edit', 'performance', 'Edit performance records'),
    ('performance.review', 'performance', 'review', 'performance', 'Submit and conduct performance reviews'),
    ('performance.approve', 'performance', 'approve', 'performance', 'Approve performance workflows'),
    ('performance.feedback', 'performance', 'feedback', 'performance', 'Give and manage feedback'),
    ('performance.settings', 'performance', 'settings', 'performance', 'Manage performance settings')
) AS v(code, module, action, resource, description)
WHERE NOT EXISTS (
  SELECT 1 FROM hrms.permissions p WHERE p.code = v.code AND p.deleted_at IS NULL
);

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'super_admin'
  AND p.code LIKE 'performance.%'
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'hr_admin'
  AND p.code IN (
    'performance.view', 'performance.create', 'performance.edit',
    'performance.review', 'performance.approve', 'performance.feedback', 'performance.settings'
  )
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'manager'
  AND p.code IN ('performance.view', 'performance.review', 'performance.feedback')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

INSERT INTO hrms.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM hrms.roles r
CROSS JOIN hrms.permissions p
WHERE r.code = 'employee'
  AND p.code IN ('performance.view', 'performance.feedback')
  AND NOT EXISTS (
    SELECT 1 FROM hrms.role_permissions rp WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- -----------------------------------------------------------------------------
-- Default performance settings in organization_settings
-- -----------------------------------------------------------------------------

UPDATE hrms.organization_settings os
SET settings = jsonb_set(
  COALESCE(os.settings, '{}'::jsonb),
  '{performance}',
  COALESCE(os.settings->'performance', '{
    "reviewCycles": {"defaultDurationMonths": 12, "selfReviewDays": 7, "managerReviewDays": 14},
    "ratingScale": {"min": 1, "max": 5, "labels": {"1": "Needs Improvement", "2": "Below Expectations", "3": "Meets Expectations", "4": "Exceeds Expectations", "5": "Outstanding"}},
    "goalCategories": ["Business", "Technical", "Leadership", "Personal Development", "Customer Success"],
    "kpiTemplates": [],
    "promotionRules": {"minRatingForPromotion": 4, "minTenureMonths": 12, "requireManagerApproval": true, "requireHrApproval": true},
    "notifications": {"reviewReminder": true, "goalDueReminder": true, "feedbackNotification": true, "promotionNotification": true, "oneOnOneReminder": true}
  }'::jsonb),
  true
)
WHERE os.deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

ALTER TABLE hrms.performance_review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_goal_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_goal_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_kpi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_review_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_one_on_ones ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_one_on_one_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hrms.performance_promotion_approvals ENABLE ROW LEVEL SECURITY;

-- Org-scoped tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'performance_review_cycles',
    'performance_goals',
    'performance_kpi_templates',
    'performance_kpis',
    'performance_reviews',
    'performance_feedback',
    'performance_one_on_ones',
    'performance_promotions'
  ]
  LOOP
    EXECUTE format($sql$
      CREATE POLICY %I_select_policy ON hrms.%I
        FOR SELECT TO authenticated
        USING (
          organization_id IN (SELECT hrms.current_user_organization_ids())
          AND deleted_at IS NULL
        );
      CREATE POLICY %I_insert_policy ON hrms.%I
        FOR INSERT TO authenticated
        WITH CHECK (
          organization_id IN (SELECT hrms.current_user_organization_ids())
        );
      CREATE POLICY %I_update_policy ON hrms.%I
        FOR UPDATE TO authenticated
        USING (
          organization_id IN (SELECT hrms.current_user_organization_ids())
        );
    $sql$, t, t, t, t, t, t);
  END LOOP;
END $$;

-- Child tables via parent org
CREATE POLICY performance_goal_milestones_select_policy ON hrms.performance_goal_milestones
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.performance_goals g
      WHERE g.id = goal_id
        AND g.organization_id IN (SELECT hrms.current_user_organization_ids())
        AND g.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY performance_goal_milestones_insert_policy ON hrms.performance_goal_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.performance_goals g
      WHERE g.id = goal_id
        AND g.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY performance_goal_milestones_update_policy ON hrms.performance_goal_milestones
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.performance_goals g
      WHERE g.id = goal_id
        AND g.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY performance_goal_comments_select_policy ON hrms.performance_goal_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.performance_goals g
      WHERE g.id = goal_id
        AND g.organization_id IN (SELECT hrms.current_user_organization_ids())
        AND g.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY performance_goal_comments_insert_policy ON hrms.performance_goal_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.performance_goals g
      WHERE g.id = goal_id
        AND g.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY performance_review_approvals_select_policy ON hrms.performance_review_approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.performance_reviews r
      WHERE r.id = review_id
        AND r.organization_id IN (SELECT hrms.current_user_organization_ids())
        AND r.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY performance_review_approvals_insert_policy ON hrms.performance_review_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.performance_reviews r
      WHERE r.id = review_id
        AND r.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY performance_review_approvals_update_policy ON hrms.performance_review_approvals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.performance_reviews r
      WHERE r.id = review_id
        AND r.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY performance_one_on_one_actions_select_policy ON hrms.performance_one_on_one_actions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.performance_one_on_ones m
      WHERE m.id = meeting_id
        AND m.organization_id IN (SELECT hrms.current_user_organization_ids())
        AND m.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY performance_one_on_one_actions_insert_policy ON hrms.performance_one_on_one_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.performance_one_on_ones m
      WHERE m.id = meeting_id
        AND m.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY performance_one_on_one_actions_update_policy ON hrms.performance_one_on_one_actions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.performance_one_on_ones m
      WHERE m.id = meeting_id
        AND m.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY performance_promotion_approvals_select_policy ON hrms.performance_promotion_approvals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.performance_promotions p
      WHERE p.id = promotion_id
        AND p.organization_id IN (SELECT hrms.current_user_organization_ids())
        AND p.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY performance_promotion_approvals_insert_policy ON hrms.performance_promotion_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hrms.performance_promotions p
      WHERE p.id = promotion_id
        AND p.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );

CREATE POLICY performance_promotion_approvals_update_policy ON hrms.performance_promotion_approvals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hrms.performance_promotions p
      WHERE p.id = promotion_id
        AND p.organization_id IN (SELECT hrms.current_user_organization_ids())
    )
  );
