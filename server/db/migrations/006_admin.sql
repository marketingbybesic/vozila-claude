-- ============================================================================
-- Vozila.hr - Phase 13: Admin console foundations
-- Migration: 006_admin.sql
-- Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. audit_log — every admin action recorded, immutable.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role VARCHAR(20),
  action VARCHAR(64) NOT NULL,            -- 'listing.delete' | 'user.suspend' | 'report.resolve' | …
  entity_type VARCHAR(32),                -- 'listing' | 'user' | 'report' | …
  entity_id TEXT,                         -- UUID/string id of the affected row
  payload JSONB NOT NULL DEFAULT '{}',
  ip_hash VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_log_admin_select ON audit_log;
CREATE POLICY audit_log_admin_select ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

DROP POLICY IF EXISTS audit_log_admin_insert ON audit_log;
CREATE POLICY audit_log_admin_insert ON audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner', 'moderator'))
  );

-- No update / delete policies — log is immutable for non-service-role.

-- ----------------------------------------------------------------------------
-- 2. kill_switches — per-feature toggles for emergency response.
-- Single-row pattern: each switch is a row keyed by name.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kill_switches (
  name VARCHAR(64) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  toggled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  toggled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Default switches (idempotent insert).
INSERT INTO kill_switches (name, enabled, reason)
VALUES
  ('new_listings',      false, NULL),
  ('payments',          false, NULL),
  ('messaging',         false, NULL),
  ('signups',           false, NULL),
  ('maintenance_banner', false, NULL)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE kill_switches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kill_switches_select_all ON kill_switches;
CREATE POLICY kill_switches_select_all ON kill_switches FOR SELECT USING (true);

DROP POLICY IF EXISTS kill_switches_admin_update ON kill_switches;
CREATE POLICY kill_switches_admin_update ON kill_switches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'owner'))
  );

-- ----------------------------------------------------------------------------
-- 3. Indexes the admin queries need.
-- ----------------------------------------------------------------------------

-- Filter listings.created_at + status fast.
CREATE INDEX IF NOT EXISTS idx_listings_created ON listings(created_at DESC);

-- Reports queue performance.
CREATE INDEX IF NOT EXISTS idx_reports_open ON reports(created_at DESC) WHERE status = 'open';

-- Leads pipeline performance.
CREATE INDEX IF NOT EXISTS idx_leads_new ON leads(created_at DESC) WHERE status = 'new';

-- ----------------------------------------------------------------------------
-- 4. View — admin overview KPIs in one shot. Cheap counts; no heavy joins.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW admin_overview AS
SELECT
  (SELECT COUNT(*) FROM listings WHERE status IN ('active', 'published'))    AS listings_active,
  (SELECT COUNT(*) FROM listings WHERE status = 'sold')                       AS listings_sold,
  (SELECT COUNT(*) FROM listings WHERE created_at > NOW() - INTERVAL '7 days') AS listings_new_7d,
  (SELECT COUNT(*) FROM profiles)                                             AS users_total,
  (SELECT COUNT(*) FROM profiles WHERE subscription_tier IS NOT NULL
                              AND subscription_status IN ('active', 'trialing')) AS subscribers_active,
  (SELECT COUNT(*) FROM reports WHERE status = 'open')                        AS reports_open,
  (SELECT COUNT(*) FROM leads WHERE status = 'new')                           AS leads_new,
  (SELECT COUNT(*) FROM conversations WHERE last_message_at > NOW() - INTERVAL '24 hours') AS conversations_active_24h,
  (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours') AS messages_24h,
  (SELECT COUNT(*) FROM listings WHERE is_featured = true AND featured_until > NOW()) AS listings_featured;
