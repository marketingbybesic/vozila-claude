-- ============================================================================
-- Vozila.hr - Defense-in-depth (S5/S10/S15 from SECURITY_AUDIT.md)
-- Migration: 013_defense_in_depth.sql
-- Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- S10: Rate-limit lead capture by ip_hash + listing_id (5/hour, 30/day).
-- Prevents anon spam of the leads table.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rate_limit_lead_insert()
RETURNS TRIGGER AS $$
DECLARE
  per_hour_count INT;
  per_day_count INT;
BEGIN
  IF NEW.ip_hash IS NULL THEN
    -- Authenticated leads (or trusted server insert) skip the limiter.
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO per_hour_count
  FROM leads
  WHERE ip_hash = NEW.ip_hash
    AND created_at > NOW() - INTERVAL '1 hour';
  IF per_hour_count >= 5 THEN
    RAISE EXCEPTION 'Lead capture rate limit (5/hour) exceeded for source'
      USING ERRCODE = '53400';
  END IF;

  SELECT COUNT(*) INTO per_day_count
  FROM leads
  WHERE ip_hash = NEW.ip_hash
    AND created_at > NOW() - INTERVAL '24 hours';
  IF per_day_count >= 30 THEN
    RAISE EXCEPTION 'Lead capture rate limit (30/day) exceeded for source'
      USING ERRCODE = '53400';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='leads') THEN
    DROP TRIGGER IF EXISTS rate_limit_lead_insert_trg ON leads;
    CREATE TRIGGER rate_limit_lead_insert_trg
      BEFORE INSERT ON leads
      FOR EACH ROW EXECUTE FUNCTION public.rate_limit_lead_insert();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_ip_hash_created
  ON leads (ip_hash, created_at)
  WHERE ip_hash IS NOT NULL;

-- ----------------------------------------------------------------------------
-- S15: audit log for admin-state-mutating actions (listings approval,
-- user role change, ad insert, manual price/feature flag flips).
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id UUID,           -- auth.users.id (nullable for system actions)
  action VARCHAR(64) NOT NULL,
  target_table VARCHAR(64),
  target_id TEXT,
  diff JSONB,              -- {before: {...}, after: {...}, fields: [...]}
  ip_hash VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor      ON admin_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action     ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target     ON admin_audit_log(target_table, target_id);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_admin_read ON admin_audit_log;
CREATE POLICY audit_admin_read ON admin_audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Inserts go through SECURITY DEFINER helper, never direct.
DROP POLICY IF EXISTS audit_no_direct_insert ON admin_audit_log;
CREATE POLICY audit_no_direct_insert ON admin_audit_log
  FOR INSERT
  WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action VARCHAR(64),
  p_target_table VARCHAR(64),
  p_target_id TEXT,
  p_diff JSONB DEFAULT NULL,
  p_ip_hash VARCHAR(64) DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_audit_log
    (actor_id, action, target_table, target_id, diff, ip_hash, user_agent)
  VALUES
    (auth.uid(), p_action, p_target_table, p_target_id, p_diff, p_ip_hash, p_user_agent);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.log_admin_action(VARCHAR, VARCHAR, TEXT, JSONB, VARCHAR, TEXT) TO authenticated;

COMMENT ON TABLE admin_audit_log IS
  'S15: append-only audit trail of admin-mutating actions. Read by admins, written via log_admin_action SECURITY DEFINER.';

NOTIFY pgrst, 'reload schema';
